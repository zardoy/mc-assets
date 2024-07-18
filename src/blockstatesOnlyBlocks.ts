import fs from 'fs'

const blocksstatesModels = JSON.parse(fs.readFileSync('./dist/blockStatesModels.json', 'utf8'))

const blockstatesOnlyBlocks: any = {}

const transformByKey = (key: string) => {
    const obj = blocksstatesModels[key]
    blockstatesOnlyBlocks[key] = {}
    for (const version of Object.keys(obj)) {
        blockstatesOnlyBlocks[key][version] = {}
        for (const blockOrItem of Object.keys(obj[version])) {
            if (key === 'models' && !blockOrItem.startsWith('block/')) {
                continue
            }
            blockstatesOnlyBlocks[key][version][blockOrItem] = obj[version][blockOrItem]
        }
    }
}

transformByKey('blockstates')
transformByKey('models')

fs.writeFileSync('./dist/blockstatesOnlyBlocks.json', JSON.stringify(blockstatesOnlyBlocks, null, 4))
