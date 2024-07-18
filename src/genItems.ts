import fs from 'fs'
import { join } from 'path'
import { filesize } from 'filesize'

// todo remove
import { makeTextureAtlas, writeCanvasStream } from './atlas'
import looksSame from 'looks-same' // ensure after canvas import
import { versionToNumber } from './utils'
import { AssetsParser } from './consumer/parser'
import { getLoadedBlockstatesStore, getLoadedModelsStore } from './consumer'
import { ItemModel } from './consumer/types'
import { Image, createCanvas } from 'canvas'
import { JsonAtlas } from './consumer/atlasCreator'

const legacyInvsprite = JSON.parse(fs.readFileSync('./custom/invsprite.json', 'utf8'))
const invspriteImage = new Image()
invspriteImage.src = './custom/invsprite.png'

const rawData = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))
const latestTextures = Object.fromEntries(Object.entries(rawData.latest['textures/']).map(([key, path]) => [key.replace('.png', ''), path.replace('.png', '')]))
const blockstatesModels = JSON.parse(fs.readFileSync('./temp/blockStatesModels.json', 'utf8'))

const assetsParser = new AssetsParser('latest', getLoadedBlockstatesStore(blockstatesModels), getLoadedModelsStore(blockstatesModels))

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
  // const allTextures

  let allActualItemsJson = JSON.parse(fs.readFileSync('./src/items.json', 'utf8'))

  const parentReferences = {} as Record<string, string[]>
  const allModels = blockstatesModels.models;
  const latestModels = allModels.latest;
  for (const [modelName, model] of Object.entries(latestModels)) {
    if (!modelName.startsWith('item/')) continue
    if (!model.parent) continue
    parentReferences[model.parent] ??= []
    parentReferences[model.parent]!.push(modelName)
  }
  const allItemsModelsWithoutParentReference = {} as Record<string, ItemModel>
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

    const sliceCanvas = createCanvas(16, 16);
    const sliceCtx = sliceCanvas.getContext('2d');
    sliceCtx.drawImage(invspriteImage, x, y, 32, 32, 0, 0, 16, 16);
    return sliceCanvas.toDataURL()
  }

  const validated = new Set<string>()
  const modelHasNoTextures = (model: ItemModel) => {
    return !model.textures || Object.keys(model.textures).length === 0
  }
  const isGeneratedModelName = (name: string) => {
    return name === 'item/generated' || name === 'builtin/generated' || name === 'builtin/entity'
  }
  const validateItemModel = (model: ItemModel, name: string, allModels) => {
    if (validated.has(name)) return
    validated.add(name)
    if (model.parent) {
      if (model.parent.startsWith('block/') || (isGeneratedModelName(model.parent) && modelHasNoTextures(model))) {
        const invspriteName = name.replace('item/', '')
        if (!isCube(invspriteName)) {
          if (legacyInvsprite[invspriteName]) {
            usedInvsprite.push(invspriteName)
            const textureKey = `invsprite_${invspriteName}`
            addTextures[textureKey] = textureFromInvsprite(invspriteName)
            allModels[name] = {
              textures: {
                layer0: textureKey
              }
            }
          } else {
            console.warn('parent block model', invspriteName, 'of', name, 'is not a cube and no invsprite found')
          }
        }
      } else if (!isGeneratedModelName(model.parent)) {
        if (!latestModels[model.parent]) {
          throw new Error(`parent item model ${model.parent} not found`)
        }
        validateItemModel(allModels[model.parent], model.parent, allModels)
      }

    }
  }

  latestModels['item/missing_texture'] = {
    textures: {
      layer0: 'missing_texture'
    }
  }
  addTextures['missing_texture'] = `data:image/png;base64,${fs.readFileSync(join('./custom/missing_texture.png'), 'base64')}`


  for (const [name, model] of Object.entries(latestModels)) {
    if (!name.startsWith('item/')) continue
    validateItemModel(model, name, latestModels)
  }

  const createItemsAtlas = (key: string, textures: Record<string, string>) => {
    const { json, image } = makeTextureAtlas(Object.keys(textures), (name) => {
      let texPath = textures[name]!;
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

  fs.writeFileSync('./inv.json', JSON.stringify(usedInvsprite, null, 4), 'utf8')
  fs.writeFileSync('./dist/blockStatesModels.json', JSON.stringify(blockstatesModels, null, 4), 'utf8')
}

generateItemsAtlases()
