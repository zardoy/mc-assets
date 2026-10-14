import { describe, test, expect } from 'vitest'
import fs from 'fs'

import { getBlocksWithoutGeometry, INVISIBLE_BLOCKS } from './blocksWithoutGeometry'

const blockstatesModels = JSON.parse(fs.readFileSync('./dist/blockStatesModels.json', 'utf8'))

// Block entities still without a custom model. A new block entity without one fails this test.
const KNOWN_MISSING = [
    'conduit',
    ...['', 'exposed_', 'weathered_', 'oxidized_'].flatMap(stage => [`${stage}copper_golem_statue`, `waxed_${stage}copper_golem_statue`]),
]

describe('blocks without geometry', () => {
    test('are only the invisible blocks and the known missing block entities', () => {
        expect(getBlocksWithoutGeometry(blockstatesModels).sort()).toEqual([...INVISIBLE_BLOCKS, ...KNOWN_MISSING].sort())
    })

    test('include a block whose model has no elements, through its parents', () => {
        const blocks = getBlocksWithoutGeometry({
            blockstates: { latest: { empty: { variants: { '': { model: 'block/empty' } } }, cube: { variants: { '': { model: 'block/cube_child' } } } } },
            models: {
                latest: { 'block/empty': { parent: 'block/particle_only' }, 'block/particle_only': { textures: { particle: 'block/stone' } }, 'block/cube_child': { parent: 'block/cube' } },
                '1.20': { 'block/cube': { elements: [{ from: [0, 0, 0], to: [16, 16, 16] }] } },
            },
        })
        expect(blocks).toEqual(['empty'])
    })
})
