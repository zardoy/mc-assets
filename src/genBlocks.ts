import fs from 'fs'
import { makeTextureAtlas } from './atlasNode'
import { join } from 'path/posix'
import { processAnimatedTexture } from './consumer/atlasCreator'

const rawData = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))
const blockstatesModels = JSON.parse(
    fs.existsSync('./dist/blockStatesModels.json')
        ? fs.readFileSync('./dist/blockStatesModels.json', 'utf8')
        : fs.readFileSync('./temp/blockStatesModels.json', 'utf8')
)

blockstatesModels.blockstates.latest['unknown'] = {
    variants: {
        "": {
            model: "block/unknown"
        }
    }
}
blockstatesModels.blockstates.latest['errored'] = {
    variants: {
        "": {
            model: "block/errored"
        }
    }
}
const texturesAddFirst = {
    'unknown': '../custom/missing_texture.png',
    'errored': '../custom/errored_texture.png',
    'end_portal_top': '../custom/textures/end_portal_top.png',
    'banner/banner_black': '../custom/textures/banner/banner_black.png',
    'banner/banner_blue': '../custom/textures/banner/banner_blue.png',
    'banner/banner_brown': '../custom/textures/banner/banner_brown.png',
    'banner/banner_cyan': '../custom/textures/banner/banner_cyan.png',
    'banner/banner_gray': '../custom/textures/banner/banner_gray.png',
    'banner/banner_green': '../custom/textures/banner/banner_green.png',
    'banner/banner_light_blue': '../custom/textures/banner/banner_light_blue.png',
    'banner/banner_light_gray': '../custom/textures/banner/banner_light_gray.png',
    'banner/banner_lime': '../custom/textures/banner/banner_lime.png',
    'banner/banner_magenta': '../custom/textures/banner/banner_magenta.png',
    'banner/banner_orange': '../custom/textures/banner/banner_orange.png',
    'banner/banner_pink': '../custom/textures/banner/banner_pink.png',
    'banner/banner_purple': '../custom/textures/banner/banner_purple.png',
    'banner/banner_red': '../custom/textures/banner/banner_red.png',
    'banner/banner_white': '../custom/textures/banner/banner_white.png',
    'banner/banner_yellow': '../custom/textures/banner/banner_yellow.png',
}
const texturesAddLast = {}
blockstatesModels.models.latest['block/unknown'] = {
    "parent": "block/cube_all",
    "textures": {
        "all": "block/unknown"
    }
}
blockstatesModels.models.latest['block/errored'] = {
    "parent": "block/cube_all",
    "textures": {
        "all": "block/errored"
    }
}

for (const [name, { textures = {} }] of Object.entries(blockstatesModels.models.latest)) {
    for (const texture of Object.values(textures as Record<string, string>)) {
        const textureNameClean = texture.replace('block/', '')
        const textureNamePath = textureNameClean + '.png'
        if (!textureNamePath.startsWith('entity/')) continue
        const texturePath = rawData.latest['textures/'][textureNamePath]
        if (!texturePath) throw new Error(`Missing texture ${textureNamePath}: ${texture}`)
        texturesAddLast[textureNameClean] = texturePath
    }
}

const makeAtlas = (name, textures) => {
    // Process animated textures first
    const processedTextures: Record<string, string> = {}
    const animatedTextures: Record<string, { frames: string[], frameImages: HTMLImageElement[] }> = {}

    for (const [textureName, texturePath] of Object.entries(textures)) {
        // Check if this texture has a .mcmeta file (indicating animation)
        const mcmetaPath = texturePath.replace('.png', '.png.mcmeta')
        if (fs.existsSync(join('data', mcmetaPath))) {
            try {
                // Load the image to process frames
                const imagePath = join('data', texturePath)
                const imageBuffer = fs.readFileSync(imagePath)
                const { Image } = require('canvas')
                const image = new Image()
                image.src = imageBuffer

                // Process the animated texture
                const { frames, frameImages } = processAnimatedTexture(textureName, image, 16)
                animatedTextures[textureName] = { frames, frameImages }

                // Add each frame as a separate texture
                frames.forEach((frameName, index) => {
                    processedTextures[frameName] = texturePath // Keep original path for reference
                })

                console.log(`Processed animated texture: ${textureName} -> ${frames.length} frames`)
            } catch (error) {
                console.warn(`Error processing animated texture ${textureName}:`, error)
                // Fall back to normal texture
                processedTextures[textureName] = texturePath
            }
        } else {
            // Normal texture, add as-is
            processedTextures[textureName] = texturePath
        }
    }

    const { image, json } = makeTextureAtlas(Object.keys(processedTextures), (name) => {
        // Check if this is an animated frame
        const originalTextureName = name.replace(/_\d+$/, '') // Remove frame suffix
        const isAnimatedFrame = animatedTextures[originalTextureName] && name.includes('_')

                if (isAnimatedFrame) {
            // This is a frame from an animated texture
            const frameIndex = parseInt(name.split('_').pop() || '0')
            const animatedTexture = animatedTextures[originalTextureName]
            if (!animatedTexture) {
                throw new Error(`Missing animated texture data for ${originalTextureName}`)
            }
            const frameImage = animatedTexture.frameImages[frameIndex]
            if (!frameImage) {
                throw new Error(`Missing frame ${frameIndex} for animated texture ${originalTextureName}`)
            }

            // Convert frame image to data URL
            const canvas = new (require('canvas').Canvas)(frameImage.width, frameImage.height)
            const ctx = canvas.getContext('2d')
            ctx.drawImage(frameImage, 0, 0)
            const dataUrl = canvas.toDataURL()

            return {
                contents: dataUrl,
                useOriginalSize: true,
            }
        } else {
            // Normal texture processing
            const texPath = processedTextures[name]!
            const contents = `data:image/png;base64,${fs.readFileSync(join('data', `${texPath}`), 'base64')}`
            return {
                contents,
                // todo
                useOriginalSize: name.includes('entity/'),
            }
        }
    })
    fs.writeFileSync(`./dist/${name}.png`, image as Uint8Array)
    return json
}

const latestAtlas = makeAtlas('blocksAtlasLatest', {
    ...texturesAddFirst,
    ...Object.fromEntries(Object.entries(rawData.latest['textures/']).filter(([key]) => {
        return (key.startsWith('blocks/')) && key.endsWith('.png')
    }).map(([key, path]) => [key.replace('blocks/', ''), path])),
    ...texturesAddLast
})

const legacyTextures = {} as Record<string, string>
for (const version of Object.keys(rawData)) {
    if (version === 'latest') continue
    const textures = rawData[version]['textures/']
    if (!textures) continue
    for (const [key, path] of Object.entries(textures)) {
        if (!path.endsWith('.png')) continue
        if (key.startsWith('blocks/')) {
            legacyTextures[`${version}/${key.replace('blocks/', '')}`] = path
        }
    }
}

const legacyAtlas = makeAtlas('blocksAtlasLegacy', legacyTextures)

fs.writeFileSync('./dist/blockStatesModels.json', JSON.stringify(blockstatesModels, null, 4), 'utf8')
fs.writeFileSync('./dist/blocksAtlases.json', JSON.stringify({
    latest: latestAtlas,
    legacy: legacyAtlas
}, null, 4), 'utf8')

// write lastBlockStatesModels.json for debugging

for (const version of Object.keys(blockstatesModels.models)) {
    if (version === 'latest') continue
    delete blockstatesModels.models[version]
}
for (const version of Object.keys(blockstatesModels.blockstates)) {
    if (version === 'latest') continue
    delete blockstatesModels.blockstates[version]
}

fs.writeFileSync('./temp/lastBlockStatesModels.json', JSON.stringify(blockstatesModels, null, 4), 'utf8')
