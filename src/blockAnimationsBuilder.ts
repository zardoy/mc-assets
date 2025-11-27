import fs from 'fs'
import path from 'path/posix'
import { Canvas, Image } from 'canvas'

//@ts-ignore
globalThis.Image = Image

interface McMetaAnimation {
  animation: {
    frametime?: number
    frames?: number[] | { index: number; time: number }[]
    interpolate?: boolean
  }
}

interface BlockAnimation {
  name: string
  frameTime: number
  frameCount: number
  frames: string[]
  interpolate?: boolean
}

export const buildBlockAnimations = () => {
  console.log('Building block animations...')

  const rawData = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))
  const blockAnimations: Record<string, BlockAnimation> = {}

  // Process all versions
  for (const [version, versionData] of Object.entries(rawData)) {
    const textures = versionData['textures/']
    if (!textures) continue

    for (const [texturePath, filePath] of Object.entries(textures)) {
      if (!texturePath.endsWith('.png')) continue

      // Check if this is a block texture
      if (!texturePath.startsWith('blocks/') && !texturePath.startsWith('block/')) continue

      const textureName = texturePath.replace('blocks/', '').replace('block/', '').replace('.png', '')
      const mcmetaPath = path.join('data', filePath.replace('.png', '.png.mcmeta'))

      // Check if .mcmeta file exists
      if (!fs.existsSync(mcmetaPath)) continue

      try {
        const mcmetaContent = fs.readFileSync(mcmetaPath, 'utf8')
        const mcmeta: McMetaAnimation = JSON.parse(mcmetaContent)

        if (!mcmeta.animation) continue

        // Load the image to get frame count
        const imagePath = path.join('data', filePath)
        const imageBuffer = fs.readFileSync(imagePath)
        const image = new Image()
        image.src = imageBuffer

        // Calculate frame count based on image height
        // Each frame is typically 16 pixels high, so total frames = height / 16
        const frameHeight = image.width
        const frameCount = Math.floor(image.height / frameHeight)

        if (frameCount <= 1) continue // Skip if no animation frames

        // Generate frame names with postfixes
        const frames: string[] = []
        for (let i = 0; i < frameCount; i++) {
          frames.push(`${textureName}_${i}`)
        }

        // Determine frame time
        let frameTime = mcmeta.animation.frametime || 3 // Default to 3 ticks

        // Handle custom frame timing if specified
        if (mcmeta.animation.frames && Array.isArray(mcmeta.animation.frames)) {
          // If frames array contains objects with time, use average
          if (typeof mcmeta.animation.frames[0] === 'object') {
            const frameTimes = (mcmeta.animation.frames as { time: number }[]).map(f => f.time)
            frameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length
          }
        }

        const animationKey = version === 'latest' ? textureName : `${version}/${textureName}`

        blockAnimations[animationKey] = {
          name: textureName,
          frameTime,
          frameCount,
          frames,
          interpolate: mcmeta.animation.interpolate
        }

        console.log(`Found animation: ${animationKey} (${frameCount} frames, ${frameTime} ticks)`)

      } catch (error) {
        console.warn(`Error processing ${mcmetaPath}:`, error)
      }
    }
  }

  // Write the animations to dist
  fs.mkdirSync('./dist', { recursive: true })
  fs.writeFileSync('./dist/blockAnimations.json', JSON.stringify(blockAnimations, null, 4), 'utf8')

  console.log(`Built ${Object.keys(blockAnimations).length} block animations`)
}

buildBlockAnimations()
