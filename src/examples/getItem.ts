import fs from 'fs'
import { join } from 'path'
import { BlockModel, BlockStates, ItemModel } from '../consumer/types'
import { VersionedStore } from '../consumer/versionedStore'

console.time('parse')
const blockstatesModels = JSON.parse(fs.readFileSync('./dist/blockStatesModels.json', 'utf8'))
console.timeEnd('parse')

const blockstates = new VersionedStore<BlockStates>()
blockstates.loadData(blockstatesModels.blockstates)

console.log(blockstates.get('1.20.2', 'stone')?.variants?.[''])
