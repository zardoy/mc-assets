import { describe, test, expect } from 'vitest'

import { getBlocksWithoutGeometry } from './blocksWithoutGeometry'

describe('blocks without geometry', () => {
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
