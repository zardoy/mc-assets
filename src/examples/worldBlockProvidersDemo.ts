import worldBlockProvider from '../consumer/worldBlockProvider';

//@ts-ignore
import blockstatesModels from '../../dist/blockStatesModels.json';
//@ts-ignore
import blocksAtlas from '../../dist/blocksAtlases.json';

const blocksProvider = worldBlockProvider(blockstatesModels, blocksAtlas, 'latest')

console.log(blocksProvider.getTextureInfo("block/entity/decorated_pot/decorated_pot_base"))

const result = blocksProvider.getResolvedModel0_1({
    name: 'decorated_pot',
    properties: {
        facing: 'east'
    },
})

// console.log(result.elements[0].faces)

// const result2 = blocksProvider.getResolvedModel0_1({
//     name: 'fence',
//     properties: {},
// })

// console.log(result.elements.length, result2.elements.length)
