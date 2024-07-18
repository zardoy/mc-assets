import fs from 'fs'
import { AssetsParser } from '../consumer/parser'
import { VersionedStore } from '../consumer/versionedStore'
import { getLoadedBlockstatesStore, getLoadedModelsStore } from '../consumer'

const blockstatesModels = JSON.parse(fs.readFileSync('./dist/blockStatesModels.json', 'utf8'))

const assetsParser = new AssetsParser('latest', getLoadedBlockstatesStore(blockstatesModels), getLoadedModelsStore(blockstatesModels))

console.log(assetsParser.getResolvedModel({
    name: 'stone',
    properties: {},
}))

// const versionedStore = new VersionedStore();
// versionedStore.push('latest', 'key', 'data')
// versionedStore.push('1.19.1', 'key', 'data')
// versionedStore.push('1.19.0', 'key', 'data-2')
// console.log(versionedStore.get('latest', 'key'))
