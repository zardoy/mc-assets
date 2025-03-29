import { describe, it, expect } from 'vitest'
import { ItemsRenderer } from './itemsRenderer'
import { AtlasParser } from './atlasParser'
import fs from 'fs'

// Load test data
const blockstatesModels = JSON.parse(fs.readFileSync('./dist/blockStatesModels.json', 'utf8'))
const itemsAtlases = JSON.parse(fs.readFileSync('./dist/itemsAtlases.json', 'utf8'))
const blocksAtlases = JSON.parse(fs.readFileSync('./dist/blocksAtlases.json', 'utf8'))

blockstatesModels.models.latest['test:block/test'] = blockstatesModels.models.latest['minecraft:block/stone']

describe('ItemsRenderer', () => {
    const itemsAtlasParser = new AtlasParser(itemsAtlases, '')
    const blocksAtlasParser = new AtlasParser(blocksAtlases, '')
    const version = '1.21.4'
    const renderer = new ItemsRenderer(version, blockstatesModels, itemsAtlasParser, blocksAtlasParser)

    const getItemTexture = (item: string) => {
        const result = renderer.getItemTexture(item)
        if (!result) return result

        const replaceSliceDeep = (obj: any) => {
            if (typeof obj !== 'object' || obj === null) return
            if (obj['slice']) obj.slice = obj['slice'].length === 4
            Object.values(obj).forEach(replaceSliceDeep)
        }

        replaceSliceDeep(result)
        result['resolvedModel'] = !!result['resolvedModel']
        return result
    }

    describe('getItemTexture', () => {
        it('items texture', () => {
            expect(getItemTexture('item_frame')).toMatchInlineSnapshot(`
              {
                "path": "items",
                "resolvedModel": false,
                "slice": true,
                "type": "items",
              }
            `)
        })

        it('full blocks texture', () => {
            expect(getItemTexture('stone')).toMatchInlineSnapshot(`
          {
            "left": {
              "path": "blocks",
              "slice": true,
              "type": "blocks",
            },
            "resolvedModel": true,
            "right": {
              "path": "blocks",
              "slice": true,
              "type": "blocks",
            },
            "top": {
              "path": "blocks",
              "slice": true,
              "type": "blocks",
            },
          }
        `)
        })

        it('block/stone', () => {
            expect(getItemTexture('block/stone')).toMatchInlineSnapshot(`
              {
                "left": {
                  "path": "blocks",
                  "slice": true,
                  "type": "blocks",
                },
                "resolvedModel": true,
                "right": {
                  "path": "blocks",
                  "slice": true,
                  "type": "blocks",
                },
                "top": {
                  "path": "blocks",
                  "slice": true,
                  "type": "blocks",
                },
              }
            `)
        })

        it('invsprite textures', () => {
            expect(getItemTexture('black_banner')).toMatchInlineSnapshot(`
              {
                "path": "items",
                "resolvedModel": false,
                "slice": true,
                "type": "items",
              }
            `)
        })

        it('not implemented logic', () => {
            expect(getItemTexture('cut_copper_slab')).toMatchInlineSnapshot(`undefined`)
            expect(getItemTexture('bla_bla')).toMatchInlineSnapshot(`undefined`)
        })
    })

    describe('resolveTexture', () => {
        it('should resolve item textures correctly', () => {
            const result = renderer.resolveTexture('items/item_frame')!
            result['slice'] = (result['slice'].length === 4) as any
            expect(result).toMatchInlineSnapshot(`
            {
              "path": "items",
              "slice": true,
              "type": "items",
            }
          `)

            expect(renderer.resolveTexture('bla')).toMatchInlineSnapshot(`undefined`)
        })
    })
})
