import { describe, expect, test } from 'vitest'
import { AtlasTextureAnimation, TextureAnimationsJson, getAnimationDuration, getAnimationFrameRect, getAnimationStateAt, getTextureAnimation, parseAnimationMcmeta } from './textureAnimations'

describe('parseAnimationMcmeta', () => {
    test('empty animation plays every frame for one tick', () => {
        // water_flow
        const animation = parseAnimationMcmeta({ animation: {} }, 32, 1024)!
        expect(animation).toMatchObject({ frameWidth: 32, frameHeight: 32, columns: 1, frameCount: 32, frametime: 1, interpolate: false })
        expect(animation.frames).toHaveLength(32)
        expect(animation.frames[5]).toEqual({ index: 5, time: 1 })
    })

    test('frametime, interpolate and custom frames', () => {
        // prismarine
        const animation = parseAnimationMcmeta({ animation: { frametime: 300, interpolate: true, frames: [0, 1, { index: 2, time: 5 }] } }, 16, 64)!
        expect(animation.interpolate).toBe(true)
        expect(animation.frames).toEqual([{ index: 0, time: 300 }, { index: 1, time: 300 }, { index: 2, time: 5 }])
    })

    test('not animated', () => {
        // other purpose mcmeta
        expect(parseAnimationMcmeta({ texture: { mipmap_strategy: 'dark_cutout' } }, 16, 16)).toBeUndefined()
        // single frame
        expect(parseAnimationMcmeta({ animation: {} }, 16, 16)).toBeUndefined()
    })

    test('explicit frame size and grid sheets', () => {
        const animation = parseAnimationMcmeta({ animation: { width: 16, height: 8 } }, 32, 16)!
        expect(animation).toMatchObject({ frameWidth: 16, frameHeight: 8, columns: 2, frameCount: 4 })
        expect(getAnimationFrameRect(animation, 3)).toEqual({ x: 16, y: 8, width: 16, height: 8 })
        // only width: the frame is as high as the image
        expect(parseAnimationMcmeta({ animation: { width: 8 } }, 32, 16)).toMatchObject({ frameWidth: 8, frameHeight: 16, columns: 4, frameCount: 4 })
    })

    test('invalid data', () => {
        expect(() => parseAnimationMcmeta({ animation: { frames: [4] } }, 16, 64)).toThrow(/out of range/)
        expect(() => parseAnimationMcmeta({ animation: { frametime: 0 } }, 16, 64)).toThrow(/frametime/)
        expect(() => parseAnimationMcmeta({ animation: { width: 10 } }, 16, 64)).toThrow(/not divisible/)
    })
})

describe('getAnimationStateAt', () => {
    const animation = parseAnimationMcmeta({ animation: { frametime: 2, frames: [0, { index: 2, time: 4 }, 1] } }, 16, 48)!

    test('duration', () => {
        expect(getAnimationDuration(animation)).toBe(8)
    })

    test('picks frame by time and loops', () => {
        const frameAt = (tick: number) => getAnimationStateAt(animation, tick).frameIndex
        expect([0, 1, 2, 5, 6, 7, 8, 9, 10].map(frameAt)).toEqual([0, 0, 2, 2, 1, 1, 0, 0, 2])
        expect(frameAt(-1)).toBe(1)
    })

    test('interpolation progress', () => {
        expect(getAnimationStateAt(animation, 3)).toEqual({ frameIndex: 2, nextFrameIndex: 1, progress: 0.25 })
        // wraps to the first frame
        expect(getAnimationStateAt(animation, 7)).toEqual({ frameIndex: 1, nextFrameIndex: 0, progress: 0.5 })
    })
})

describe('getTextureAnimation', () => {
    const make = (frametime: number): AtlasTextureAnimation => ({ ...parseAnimationMcmeta({ animation: { frametime } }, 16, 32)!, x: 0, y: 0 })
    const json: TextureAnimationsJson = {
        image: { width: 16, height: 32 },
        latest: { fire: make(3), sponge: make(1) },
        versions: {
            // changed in 1.9: older versions have own animation, `sponge` was not animated
            '1.9': { fire: make(2), sponge: null },
            '1.8': { fire: make(1) },
        },
    }

    test('resolves like versioned atlas', () => {
        expect(getTextureAnimation(json, 'fire')!.frametime).toBe(3)
        expect(getTextureAnimation(json, 'fire', '1.9')!.frametime).toBe(3)
        expect(getTextureAnimation(json, 'fire', '1.8.9')!.frametime).toBe(2)
        expect(getTextureAnimation(json, 'fire', '1.7.10')!.frametime).toBe(1)
        expect(getTextureAnimation(json, 'unknown')).toBeUndefined()
    })

    test('not animated in older version', () => {
        expect(getTextureAnimation(json, 'sponge', '1.21.4')).toBeDefined()
        expect(getTextureAnimation(json, 'sponge', '1.8.9')).toBeUndefined()
    })
})
