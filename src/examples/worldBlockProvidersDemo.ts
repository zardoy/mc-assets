import worldBlockProvider from '../consumer/worldBlockProvider';

//@ts-ignore
import blockstatesModels from '../../dist/blockStatesModels.json';
//@ts-ignore
import blocksAtlas from '../../dist/blocksAtlases.json';

const blocksProvider = worldBlockProvider(blockstatesModels, blocksAtlas, 'latest')

// const result = blocksProvider.getResolvedModel0_1({
//     name: 'stone',
//     properties: {},
// })

// const result2 = blocksProvider.getResolvedModel0_1({
//     name: 'fence',
//     properties: {},
// })

// console.log(result.elements.length, result2.elements.length)
