import { Image, Canvas } from 'canvas'
import { AtlasParser } from '../consumer'
import fs from 'fs'

//@ts-ignore
globalThis.Image = Image
globalThis.Canvas = Canvas

const blocksAtlase = JSON.parse(fs.readFileSync('./dist/blocksAtlases.json', 'utf8'))
const image = fs.readFileSync('./dist/blocksAtlasLatest.png', 'base64')

const makeOnly = [
    'sand',
    'red_sand',
    'gravel',
    'dirt',
    'coarse_dirt',
    'podzol',
    'grass_path',
    'farmland',
    'sandstone',
    'red_sandstone',
    'stone',
    'granite',
    'diorite',
    'andesite',
    'netherrack',
    'end_stone',
    'prismarine',
    'dark_prismarine',
    'sea_lantern',
    'sea_lantern',
    'prismarine_bricks',
    'prismarine_bricks_slab',
    'prismarine_bricks_stairs',
    'prismarine_bricks_wall',
    'prismarine_bricks_fence',
    'prismarine_bricks_fence_gate',
    'prismarine_bricks_fence_gate',
    'acacia_planks',
    'birch_planks',
    'crimson_planks',
    'dark_oak_planks',
    'jungle_planks',
    'oak_planks',
    'spruce_planks',
    'warped_planks',
    'mangrove_planks',
    'cherry_planks',
    'bamboo_planks',
    'bamboo_mosaic',
    'bamboo_mosaic_slab',
    'bamboo_mosaic_stairs',
    // woord, log
    'acacia_log',
    'birch_log',
    'crimson_log',
    'dark_oak_log',
    'jungle_log',
    'oak_log',
    'spruce_log',
]

const atlasParser = new AtlasParser(blocksAtlase, `data:image/png;base64,${image}`)
atlasParser.makeNewAtlas(
    'latest', (name) => {
    if (makeOnly.includes(name)) {
        return undefined
    }
    return false
},
    undefined,
    undefined,
    undefined,
    {
        needHorizontalIndexes: true,
    }
).then(({ image, newAtlasParser, atlas }) => {
    console.log('atlas.textures', atlas.textures)
    fs.writeFileSync(`./dist/test.png`, image.replace('data:image/png;base64,', ''), 'base64')
})
