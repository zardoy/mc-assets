import fs from 'fs'
import { join } from 'path'
import { BlockModel, BlockStates, ItemModel } from '../consumer/types'
import { VersionedStore } from '../consumer/versionedStore'
import { AtlasParser } from '../consumer'

//@ts-ignore
import itemsAtlases from '../../dist/itemsAtlases.json'
//@ts-ignore
import blocksAtlases from '../../dist/blocksAtlases.json'
import { ItemsRenderer } from '../consumer/itemsRenderer'

const blockstatesModels = JSON.parse(fs.readFileSync('./dist/blockStatesModels.json', 'utf8'))

const itemsAtlasParser = new AtlasParser(itemsAtlases, '')
const blocksAtlasParser = new AtlasParser(blocksAtlases, '')

console.log(blocksAtlasParser.getTextureInfo("entity/decorated_pot/decorated_pot_base"))
// console.log(new ItemsRenderer('latest', blockstatesModels, itemsAtlasParser, blocksAtlasParser).getItemTexture('oak_sapling'))
