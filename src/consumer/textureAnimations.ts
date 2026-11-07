import { versionToNumber } from './utils'

/**
 * Animation of a texture, described by its `.png.mcmeta` file.
 * The texture itself is a sprite sheet: frames are laid out left to right, top to bottom.
 */
export type TextureAnimation = {
    frameWidth: number
    frameHeight: number
    /** Frames per row of the sprite sheet. Almost always 1 (frames are stacked vertically) */
    columns: number
    /** Number of frames in the sprite sheet */
    frameCount: number
    /** Default ticks per frame (vanilla default is 1) */
    frametime: number
    /** Playback order. Always normalized: `time` is resolved with `frametime` fallback */
    frames: { index: number, time: number }[]
    /** Blend between the current and the next frame */
    interpolate: boolean
}

/** Animation as shipped in `blocksAnimations.json`: where its sprite sheet is placed in `blocksAnimationsAtlas.png` */
export type AtlasTextureAnimation = TextureAnimation & {
    /** Top left corner of the sprite sheet in the animations atlas image, in pixels */
    x: number
    y: number
}

/**
 * `blocksAnimations.json`. Keys are texture names the same as in the blocks atlas (`water_still`).
 *
 * Only animated textures are listed. Textures in the blocks atlas always contain the first frame,
 * so you can render everything without this data and only use it to play the animations.
 */
export type TextureAnimationsJson = {
    /** Size of `blocksAnimationsAtlas.png` */
    image: { width: number, height: number }
    latest: Record<string, AtlasTextureAnimation>
    /**
     * Same format as other atlases: an entry at version `V` is valid for versions older than `V`.
     * `null` means the texture was not animated back then (while it is animated in newer versions).
     */
    versions: Record<string, Record<string, AtlasTextureAnimation | null>>
}

const positiveNumber = (value: unknown, what: string) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${what}: ${JSON.stringify(value)}`)
    return value
}

/**
 * Parses the contents of `<texture>.png.mcmeta` (already `JSON.parse`d), the same way vanilla does it.
 * @returns undefined if the texture is not animated (no `animation` key or just one frame)
 * @throws if the metadata doesn't match the image
 */
export const parseAnimationMcmeta = (mcmeta: any, imageWidth: number, imageHeight: number): TextureAnimation | undefined => {
    const animation = mcmeta?.animation
    if (!animation || typeof animation !== 'object') return

    // frame size: when none is specified the frame is a square
    let frameWidth: number
    let frameHeight: number
    if (animation.width !== undefined || animation.height !== undefined) {
        frameWidth = animation.width !== undefined ? positiveNumber(animation.width, 'animation.width') : imageWidth
        frameHeight = animation.height !== undefined ? positiveNumber(animation.height, 'animation.height') : imageHeight
    } else {
        frameWidth = frameHeight = Math.min(imageWidth, imageHeight)
    }
    if (imageWidth % frameWidth || imageHeight % frameHeight) {
        throw new Error(`Image ${imageWidth}x${imageHeight} is not divisible by frame size ${frameWidth}x${frameHeight}`)
    }
    const columns = imageWidth / frameWidth
    const frameCount = columns * (imageHeight / frameHeight)
    if (frameCount <= 1) return

    const frametime = animation.frametime === undefined ? 1 : positiveNumber(animation.frametime, 'animation.frametime')
    let frames: TextureAnimation['frames']
    if (animation.frames === undefined) {
        frames = Array.from({ length: frameCount }, (_, index) => ({ index, time: frametime }))
    } else {
        if (!Array.isArray(animation.frames) || !animation.frames.length) throw new Error('animation.frames must be a non-empty array')
        frames = animation.frames.map((frame: number | { index: number, time?: number }) => {
            const index = typeof frame === 'number' ? frame : frame?.index
            if (!Number.isInteger(index) || index < 0 || index >= frameCount) throw new Error(`Frame index ${JSON.stringify(frame)} is out of range (${frameCount} frames)`)
            return {
                index,
                time: typeof frame === 'object' && frame.time !== undefined ? positiveNumber(frame.time, 'frame time') : frametime
            }
        })
    }

    return {
        frameWidth,
        frameHeight,
        columns,
        frameCount,
        frametime,
        frames,
        interpolate: animation.interpolate === true,
    }
}

export const getAnimationDuration = (animation: Pick<TextureAnimation, 'frames'>) => {
    return animation.frames.reduce((sum, frame) => sum + frame.time, 0)
}

/**
 * Which frame to show at the given game time.
 * @param tick game time in ticks (20 per second). Fractions are allowed, use them for smooth interpolation
 */
export const getAnimationStateAt = (animation: Pick<TextureAnimation, 'frames'>, tick: number) => {
    const { frames } = animation
    const duration = getAnimationDuration(animation)
    let time = ((tick % duration) + duration) % duration
    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i]!
        if (time < frame.time) {
            return {
                frameIndex: frame.index,
                nextFrameIndex: frames[(i + 1) % frames.length]!.index,
                /** 0..1 progress to the next frame, only meaningful for `interpolate` animations */
                progress: time / frame.time,
            }
        }
        time -= frame.time
    }
    // unreachable: time is always less than duration
    return { frameIndex: frames[0]!.index, nextFrameIndex: frames[0]!.index, progress: 0 }
}

/** Position of the frame inside the sprite sheet, in pixels */
export const getAnimationFrameRect = (animation: Pick<TextureAnimation, 'frameWidth' | 'frameHeight' | 'columns'>, frameIndex: number) => {
    return {
        x: (frameIndex % animation.columns) * animation.frameWidth,
        y: Math.floor(frameIndex / animation.columns) * animation.frameHeight,
        width: animation.frameWidth,
        height: animation.frameHeight,
    }
}

const sortedVersionsCache = new WeakMap<TextureAnimationsJson['versions'], string[]>()

/**
 * @param version game version the textures are used with, the same one you pass to atlas `getTextureInfo`
 * @returns undefined if the texture is not animated in that version
 */
export const getTextureAnimation = (animations: TextureAnimationsJson, textureName: string, version = 'latest'): AtlasTextureAnimation | undefined => {
    let sortedVersions = sortedVersionsCache.get(animations.versions)
    if (!sortedVersions) {
        sortedVersions = Object.keys(animations.versions).sort((a, b) => versionToNumber(a) - versionToNumber(b))
        sortedVersionsCache.set(animations.versions, sortedVersions)
    }
    const versionNumber = versionToNumber(version)
    for (const ver of sortedVersions) {
        // not inclusive: data at version X is valid for versions older than X
        if (versionNumber < versionToNumber(ver) && textureName in animations.versions[ver]!) {
            return animations.versions[ver]![textureName] ?? undefined
        }
    }
    return animations.latest[textureName]
}
