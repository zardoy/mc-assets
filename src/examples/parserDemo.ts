import fs from 'fs'
import { AssetsParser } from '../consumer/assetsParser'
import { VersionedStore } from '../consumer/versionedStore'
import { getLoadedBlockstatesStore, getLoadedModelsStore } from '../consumer'

const blockstatesModels = JSON.parse(fs.readFileSync('./dist/blockStatesModels.json', 'utf8'))

const blockstates = getLoadedBlockstatesStore(blockstatesModels)
const oldGet1 = blockstates.get
blockstates.get = (ver, key) => {
    console.log(`get ${ver} ${key}`)
    return oldGet1.call(blockstates, ver, key)
}
const models = getLoadedModelsStore(blockstatesModels)
const oldGet2 = models.get
models.get = (ver, key) => {
    console.log(`get model ${ver} ${key}`)
    // if (key === 'block/block') ver = 'latest'
    return oldGet2.call(models, ver, key)
}
const assetsParser = new AssetsParser('1.21.4', blockstates, models)

const modelsStore = getLoadedModelsStore(blockstatesModels)

console.dir(assetsParser.getAllResolvedModels({
    name: 'grass_block',
    properties: {
        snowy: false
    },
}, false), {
    depth: 6,
})

// console.log(modelsStore.get('latest', 'block/stone_mirrored'))

// const versionedStore = new VersionedStore();
// versionedStore.push('latest', 'key', 'data')
// versionedStore.push('1.19.1', 'key', 'data')
// versionedStore.push('1.19.0', 'key', 'data-2')
// console.log(versionedStore.get('latest', 'key'))
