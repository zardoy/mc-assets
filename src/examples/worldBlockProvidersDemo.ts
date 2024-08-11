import worldBlockProvider from '../consumer/worldBlockProvider';

//@ts-ignore
import blockstatesModels from '../../dist/blockStatesModels.json';
//@ts-ignore
import blocksAtlas from '../../dist/blocksAtlases.json';

const blocksProvider = worldBlockProvider(blockstatesModels, blocksAtlas, 'latest')

// console.log(blocksProvider.getTextureInfo("block/entity/decorated_pot/decorated_pot_base"))

const result = blocksProvider.getAllResolvedModels0_1({
    name: 'chiseled_bookshelf',
    properties: {
        "slot_5_occupied": false,
        "slot_4_occupied": false,
        "slot_3_occupied": false,
        "slot_2_occupied": false,
        "slot_1_occupied": false,
        "slot_0_occupied": false,
        "facing": "south"
    },
})

console.log(result)

// const result2 = blocksProvider.getResolvedModel0_1({
//     name: 'fence',
//     properties: {},
// })

// console.log(result.elements.length, result2.elements.length)
