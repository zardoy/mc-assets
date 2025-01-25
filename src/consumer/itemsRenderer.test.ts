import { describe, it, expect } from 'vitest'
import { ItemsRenderer } from './itemsRenderer'
import { AtlasParser } from './atlasParser'
import fs from 'fs'

// Load test data
const blockstatesModels = JSON.parse(fs.readFileSync('./dist/blockStatesModels.json', 'utf8'))
const itemsAtlases = JSON.parse(fs.readFileSync('./dist/itemsAtlases.json', 'utf8'))
const blocksAtlases = JSON.parse(fs.readFileSync('./dist/blocksAtlases.json', 'utf8'))

describe('ItemsRenderer', () => {
    const itemsAtlasParser = new AtlasParser(itemsAtlases, '')
    const blocksAtlasParser = new AtlasParser(blocksAtlases, '')
    const renderer = new ItemsRenderer('latest', blockstatesModels, itemsAtlasParser, blocksAtlasParser)

    describe('getItemTexture', () => {
        it('items texture', () => {
            expect(renderer.getItemTexture('item_frame')).toMatchInlineSnapshot(`
              {
                "path": "items",
                "slice": [
                  720,
                  128,
                  16,
                  16,
                ],
                "type": "items",
              }
            `)
        })

        it('full blocks texture', () => {
            expect(renderer.getItemTexture('stone')).toMatchInlineSnapshot(`
              {
                "left": {
                  "path": "blocks",
                  "slice": [
                    816,
                    64,
                    16,
                    16,
                  ],
                  "type": "blocks",
                },
                "right": {
                  "path": "blocks",
                  "slice": [
                    816,
                    64,
                    16,
                    16,
                  ],
                  "type": "blocks",
                },
                "top": {
                  "path": "blocks",
                  "slice": [
                    816,
                    64,
                    16,
                    16,
                  ],
                  "type": "blocks",
                },
              }
            `)
        })

        it('invsprite textures', () => {
            expect(renderer.getItemTexture('chest')).toMatchInlineSnapshot(`
              {
                "path": "items",
                "slice": [
                  400,
                  0,
                  16,
                  16,
                ],
                "type": "items",
              }
            `)
        })

        it('not implemented logic', () => {
            expect(renderer.getItemTexture('cut_copper_slab')).toMatchInlineSnapshot(`undefined`)
        })
    })

    describe('resolveTexture', () => {
        it('should resolve item textures correctly', () => {
            expect(renderer.resolveTexture('items/item_frame')).toMatchInlineSnapshot(`
              {
                "path": "items",
                "slice": [
                  720,
                  128,
                  16,
                  16,
                ],
                "type": "items",
              }
            `)
        })
    })
})
