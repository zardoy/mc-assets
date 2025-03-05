import fs from 'fs'
import { AssetsParser } from '../consumer/assetsParser'
import { getLoadedBlockstatesStore, getLoadedModelsStore } from '../consumer'

const blockstatesModels = JSON.parse(fs.readFileSync('./dist/blockStatesModels.json', 'utf8'))

const blockstates = getLoadedBlockstatesStore(blockstatesModels)
const models = getLoadedModelsStore(blockstatesModels)
const assetsParser = new AssetsParser('latest', blockstates, models)

const normalizeTextureName = (texture: string) => {
    return texture.replace('blocks/', '').replace('block/', '')
}

let knownLatestTextures = new Set<string>()
for (const [key, value] of Object.entries(models.data.latest)) {
    if (value.textures) {
        for (const texture of Object.values(value.textures)) {
            knownLatestTextures.add(normalizeTextureName(texture))
        }
    }
}

const missingTextures = new Set<string>()
for (const [ver, modelsList] of Object.entries(models.data)) {
    if (ver === 'latest') continue
    const currentTextures = new Set<string>()
    for (const [key, value] of Object.entries(modelsList)) {
        if (value.textures) {
            for (let texture of Object.values(value.textures)) {
                texture = normalizeTextureName(texture)
                if (!knownLatestTextures.has(texture)) {
                    console.log(`Got legacy texture ${texture} for ${ver} ${key}`)
                }
                currentTextures.add(texture)
            }
        }
    }
    for (const texture of knownLatestTextures) {
        if (!currentTextures.has(texture)) {
            missingTextures.add(texture)
        }
    }
}

console.log(missingTextures)
