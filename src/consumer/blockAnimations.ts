import { z } from 'zod'

// Schema for block animation data
const BlockAnimationSchema = z.object({
  name: z.string(),
  frameTime: z.number(),
  frameCount: z.number(),
  frames: z.array(z.string()),
  interpolate: z.boolean().optional()
})

export type BlockAnimation = z.infer<typeof BlockAnimationSchema>

export type BlockAnimationsStore = Record<string, BlockAnimation>

/**
 * Load block animations from the generated JSON file
 */
export const getLoadedBlockAnimationsStore = (blockAnimations: BlockAnimationsStore) => {
  return blockAnimations
}

/**
 * Get animation data for a specific texture
 */
export const getBlockAnimation = (
  store: BlockAnimationsStore,
  textureName: string,
  version: string = 'latest'
): BlockAnimation | undefined => {
  // Try version-specific first
  const versionKey = `${version}/${textureName}`
  if (store[versionKey]) {
    return store[versionKey]
  }

  // Fall back to latest version
  if (store[textureName]) {
    return store[textureName]
  }

  return undefined
}

/**
 * Get the current frame for an animation based on game time
 */
export const getAnimationFrame = (
  animation: BlockAnimation,
  gameTime: number // in ticks
): { frameName: string; frameIndex: number } => {
  const totalAnimationTime = animation.frameTime * animation.frameCount
  const currentTime = gameTime % totalAnimationTime
  const frameIndex = Math.floor(currentTime / animation.frameTime)
  const clampedFrameIndex = Math.min(frameIndex, animation.frameCount - 1)

  return {
    frameName: animation.frames[clampedFrameIndex]!,
    frameIndex: clampedFrameIndex
  }
}

/**
 * Get all frame names for an animation
 */
export const getAnimationFrames = (animation: BlockAnimation): string[] => {
  return animation.frames
}

/**
 * Get animation duration in ticks
 */
export const getAnimationDuration = (animation: BlockAnimation): number => {
  return animation.frameTime * animation.frameCount
}
