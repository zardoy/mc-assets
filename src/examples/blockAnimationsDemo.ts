import { getLoadedBlockAnimationsStore, getBlockAnimation, getAnimationFrame } from '../consumer/blockAnimations'
import fs from 'fs'

// Load block animations from the generated file
const blockAnimations = JSON.parse(fs.readFileSync('./dist/blockAnimations.json', 'utf8'))

// Load the block animations store
const animationsStore = getLoadedBlockAnimationsStore(blockAnimations)

// Example: Get animation data for fire
const fireAnimation = getBlockAnimation(animationsStore, 'fire_layer_0')
if (fireAnimation) {
  console.log('Fire animation:', {
    name: fireAnimation.name,
    frameTime: fireAnimation.frameTime,
    frameCount: fireAnimation.frameCount,
    duration: fireAnimation.frameTime * fireAnimation.frameCount
  })

  // Get current frame at different game times
  const gameTimes = [0, 10, 50, 100]
  gameTimes.forEach(time => {
    const frame = getAnimationFrame(fireAnimation, time)
    console.log(`At game time ${time}: frame ${frame.frameIndex} (${frame.frameName})`)
  })
}

// Example: Get animation data for water flow
const waterFlowAnimation = getBlockAnimation(animationsStore, 'water_flow')
if (waterFlowAnimation) {
  console.log('Water flow animation:', {
    name: waterFlowAnimation.name,
    frameTime: waterFlowAnimation.frameTime,
    frameCount: waterFlowAnimation.frameCount,
    duration: waterFlowAnimation.frameTime * waterFlowAnimation.frameCount
  })
}

// Example: Get version-specific animation (1.13 water flow)
const legacyWaterFlowAnimation = getBlockAnimation(animationsStore, 'water_flow', '1.13')
if (legacyWaterFlowAnimation) {
  console.log('Legacy water flow animation:', {
    name: legacyWaterFlowAnimation.name,
    frameTime: legacyWaterFlowAnimation.frameTime,
    frameCount: legacyWaterFlowAnimation.frameCount
  })
}

// Example: Get firefly bush emissive animation
const fireflyAnimation = getBlockAnimation(animationsStore, 'firefly_bush_emissive')
if (fireflyAnimation) {
  console.log('Firefly bush emissive animation:', {
    name: fireflyAnimation.name,
    frameTime: fireflyAnimation.frameTime,
    frameCount: fireflyAnimation.frameCount,
    frames: fireflyAnimation.frames
  })
}

// List all available animations
console.log('\nAvailable animations:')
Object.keys(animationsStore).forEach(key => {
  const animation = animationsStore[key]!
  console.log(`- ${key}: ${animation.frameCount} frames, ${animation.frameTime} ticks per frame`)
})
