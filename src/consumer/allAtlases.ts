import { AtlasParser } from './atlasParser';

//@ts-ignore
import itemsAtlases from '../../dist/itemsAtlases.json'
//@ts-ignore
import itemsAtlasLatest from '../../dist/itemsAtlasLatest.png'
//@ts-ignore
import itemsAtlasLegacy from '../../dist/itemsAtlasLegacy.png'
//@ts-ignore
import blocksAtlases from '../../dist/blocksAtlases.json'
//@ts-ignore
import blocksAtlasLatest from '../../dist/blocksAtlasLatest.png'
//@ts-ignore
import blocksAtlasLegacy from '../../dist/blocksAtlasLegacy.png'
//@ts-ignore
import particlesAtlases from '../../dist/particlesAtlases.json'
//@ts-ignore
import particlesAtlasLatest from '../../dist/particlesAtlasLatest.png'
//@ts-ignore
import particlesAtlasLegacy from '../../dist/particlesAtlasLegacy.png'

export const itemsAtlasParser = new AtlasParser(itemsAtlases, itemsAtlasLatest, itemsAtlasLegacy)
export const blocksAtlasParser = new AtlasParser(blocksAtlases, blocksAtlasLatest, blocksAtlasLegacy)
export const particlesAtlasParser = new AtlasParser(particlesAtlases, particlesAtlasLatest, particlesAtlasLegacy)
