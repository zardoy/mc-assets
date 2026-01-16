import fs from 'fs'
import { join } from 'path/posix'
import { makeTextureAtlas } from './atlasNode'
import { processAnimatedTexture } from './consumer/atlasCreator'
import { JsonAtlas } from './consumer/atlasCreator'
import { filesize } from 'filesize'
import looksSame from 'looks-same'
import { versionToNumber } from './consumer/utils'
import { AssetsParser } from './consumer/assetsParser'
import { getLoadedBlockstatesStore, getLoadedModelsStore } from './consumer'
import { ItemModel } from './consumer/types'
import { Image, createCanvas } from 'canvas'

const legacyInvsprite = JSON.parse(fs.readFileSync('./custom/invsprite.json', 'utf8'))
const invspriteImage = new Image()
invspriteImage.src = './custom/invsprite.png'

const rawData = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))
const latestTextures = Object.fromEntries(Object.entries(rawData.latest['textures/']).map(([key, path]) => [key.replace('.png', ''), path.replace('.png', '')]))
const blockstatesModels = JSON.parse(
    fs.existsSync('./dist/blockStatesModels.json')
        ? fs.readFileSync('./dist/blockStatesModels.json', 'utf8')
        : fs.readFileSync('./temp/blockStatesModels.json', 'utf8')
)

const assetsParser = new AssetsParser('latest', getLoadedBlockstatesStore(blockstatesModels), getLoadedModelsStore(blockstatesModels))

const allModels = blockstatesModels.models
const latestModels = allModels.latest
const allItemsModelsWithoutParentReference = {} as Record<string, ItemModel>

function isCube(blockName) {
  return assetsParser.getElements({
    name: blockName,
    properties: {},
  }, true) === 1
}

export type ItemsAtlasesOutputJson = {
    latest: JsonAtlas
    legacy: JsonAtlas
    legacyMap: [string, string[]][]
}

const usedInvsprite = [] as string[]

export const generateItemsAtlases = async () => {
  const parentReferences = {} as Record<string, string[]>

  for (const [modelName, model] of Object.entries(latestModels)) {
    if (!modelName.startsWith('item/')) continue
    if (!model.parent) continue
    parentReferences[model.parent] ??= []
    parentReferences[model.parent]!.push(modelName)
  }

  for (const [modelName, model] of Object.entries(latestModels)) {
    if (!modelName.startsWith('item/')) continue
    if (parentReferences[modelName]) continue
    allItemsModelsWithoutParentReference[modelName] = model
  }

  const addTextures = {} as { [textureName: string]: string }

  for (const [modelName, model] of Object.entries(latestModels)) {
    if (!modelName.startsWith('item/')) continue
    const itemName = modelName.replace('item/', '')
    // if (allItemsJson.includes(itemName)) {
    //   allItemsJson.splice(allItemsJson.indexOf(itemName), 1)
    // } else {
    //   // console.log('not in items.json', itemName)
    // }
    // if (latestTextures[`items/${itemName}`] || latestTextures[`item/${itemName}`]) {
    //   toAddTextures.items[itemName] = latestTextures[`items/${itemName}`] || latestTextures[`item/${itemName}`]!
    //   continue
    // }
    // WILL USE IN RUNTIME
    // if (isCube(itemName)) {
    //   // console.log('cube', block.name)
    // } else if (!getItemTextureOfBlock(itemName)) {
    //   // console.warn('skipping item (not cube, no item texture):', itemName)
    // }
  }

  const textureFromInvsprite = (name: string) => {
    const { x, y } = legacyInvsprite[name]

    const sliceCanvas = createCanvas(16, 16)
    const sliceCtx = sliceCanvas.getContext('2d')
    sliceCtx.drawImage(invspriteImage, x, y, 32, 32, 0, 0, 16, 16)
    return sliceCanvas.toDataURL()
  }

  const validated = new Set<string>()
  const modelHasNoTextures = (model: ItemModel) => {
    return !model.textures || Object.keys(model.textures).length === 0
  }
  const isGeneratedModelName = (name: string) => {
    return name === 'item/generated' || name === 'builtin/generated' || name === 'builtin/entity'
  }
  const removeLegacyModels = (modelName: string) => {
    for (const [ver, data] of Object.entries(allModels)) {
      if (ver === 'latest') continue
      delete data[modelName]
    }
  }
  const possiblyReplaceInvsprite = (model: ItemModel, name: string, allModels) => {
    if (validated.has(name)) return
    validated.add(name)
    const invspriteName = name.replace('item/', '')
    if (model.parent || legacyInvsprite[invspriteName]) {
      if (legacyInvsprite[invspriteName]) {
        usedInvsprite.push(invspriteName)
        const textureKey = `invsprite_${invspriteName}`
        addTextures[textureKey] = textureFromInvsprite(invspriteName)
        allModels[name] = {
          textures: {
            layer0: textureKey
          }
        }
        removeLegacyModels(name)
      } else if (model.parent && (model.parent.startsWith('block/') || (isGeneratedModelName(model.parent) && modelHasNoTextures(model))) && !isCube(invspriteName)) {
        // console.warn('parent block model', invspriteName, 'of', name, 'is not a cube and no invsprite found')
      } else if (model.parent && !isGeneratedModelName(model.parent)) {
        if (!latestModels[model.parent]) {
          throw new Error(`parent item model ${model.parent} not found`)
        }
        possiblyReplaceInvsprite(allModels[model.parent], model.parent, allModels)
      }
    }
  }

  latestModels['item/missing_texture'] = {
    textures: {
      layer0: 'missing_texture'
    }
  }
  addTextures['missing_texture'] = `data:image/png;base64,${fs.readFileSync(join('./custom/missing_texture.png'), 'base64')}`

  latestModels['item/air'] = {
    textures: {
      layer0: 'air'
    }
  }
  addTextures['air'] = `data:image/png;base64,${fs.readFileSync(join('./custom/air.png'), 'base64')}`

  for (const [name, model] of Object.entries(latestModels)) {
    if (!name.startsWith('item/')) continue
    possiblyReplaceInvsprite(model, name, latestModels)
  }

  const createItemsAtlas = (key: string, textures: Record<string, string>) => {
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

          console.log(`Processed animated item texture: ${textureName} -> ${frames.length} frames`)
        } catch (error) {
          console.warn(`Error processing animated item texture ${textureName}:`, error)
          // Fall back to normal texture
          processedTextures[textureName] = texturePath
        }
      } else {
        // Normal texture, add as-is
        processedTextures[textureName] = texturePath
      }
    }

    const { json, image } = makeTextureAtlas(Object.keys(processedTextures), (name) => {
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
        let texPath = processedTextures[name]!
        // if starts with data url
        if (texPath.startsWith('data:image/png;base64,')) {
          return {
            contents: texPath,
          }
        }
        texPath = texPath.replace('block/blocks/', 'blocks/')
        // if (!texPath.startsWith('blocks/') && !texPath.startsWith('items/')) {
        //   texPath = `blocks/${texPath}`
        // }
        const contents = `data:image/png;base64,${fs.readFileSync(join('data', `${texPath}`), 'base64')}`
        return {
          contents,
        }
      }
    })
    fs.writeFileSync(`./dist/${key}.png`, image)
    // fs.writeFileSync(`./dist/${key}.json`, JSON.stringify(json, null, 4))
    return json
  }

  // particles
  // createItemsAtlas('particlesLatest', {
  //   ...Object.fromEntries(Object.entries(rawData.latest['textures/']).filter(([key]) => {
  //     return (key.startsWith('particle/')) && key.endsWith('.png')
  //   }))
  // })

  const latestItemsAtlas = createItemsAtlas('itemsAtlasLatest', {
    ...addTextures,
    ...Object.fromEntries(Object.entries(rawData.latest['textures/']).filter(([key]) => {
      return (key.startsWith('items/') || key.startsWith('item/')) && key.endsWith('.png')
    }).map(([key, path]) => [key.replace('items/', ''), path])),
  })

  const legacyTextures = {} as Record<string, string>
  for (const version of Object.keys(rawData)) {
    if (version === 'latest') continue
    const textures = rawData[version]['textures/']
    if (!textures) continue
    for (const [key, path] of Object.entries(textures)) {
      if (key.startsWith('items/') || key.startsWith('item/')) {
        legacyTextures[`${version}/${key.replace('items/', '')}`] = path
      }
    }
  }

  const legacyItemsAtlas = createItemsAtlas('itemsAtlasLegacy', legacyTextures)

  fs.writeFileSync('./dist/itemsAtlases.json', JSON.stringify({
    latest: latestItemsAtlas,
    legacy: legacyItemsAtlas
  }, null, 4), 'utf8')

  blockstatesModels['latestRootItems'] = Object.keys(allItemsModelsWithoutParentReference).map(m => m.replace('item/', ''))

  // fs.writeFileSync('./inv.json', JSON.stringify(usedInvsprite, null, 4), 'utf8')
  fs.writeFileSync('./dist/blockStatesModels.json', JSON.stringify(blockstatesModels, null, 4), 'utf8')
}

generateItemsAtlases()
