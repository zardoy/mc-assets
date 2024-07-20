import fs from 'fs'
import { AssetsParser } from '../consumer/assetsParser'
import { VersionedStore } from '../consumer/versionedStore'
import { getLoadedBlockstatesStore, getLoadedModelsStore } from '../consumer'

const blockstatesModels = JSON.parse(fs.readFileSync('./dist/blockStatesModels.json', 'utf8'))

const assetsParser = new AssetsParser('latest', getLoadedBlockstatesStore(blockstatesModels), getLoadedModelsStore(blockstatesModels))

const modelsStore = getLoadedModelsStore(blockstatesModels)

console.dir(assetsParser.getResolvedModel({
    name: 'oak_sign',
    properties: {},
}, true), {
    depth: 4,
})

// console.log(modelsStore.get('latest', 'block/stone_mirrored'))

// const versionedStore = new VersionedStore();
// versionedStore.push('latest', 'key', 'data')
// versionedStore.push('1.19.1', 'key', 'data')
// versionedStore.push('1.19.0', 'key', 'data-2')
// console.log(versionedStore.get('latest', 'key'))
