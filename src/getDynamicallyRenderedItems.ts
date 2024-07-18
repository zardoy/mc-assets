import fs from 'fs'

const blockstatesModels = JSON.parse(fs.readFileSync('./dist/blockStatesModels.json', 'utf8'))

for (const [name, data] of Object.entries(blockstatesModels.models.latest)) {
    if (!name.startsWith('item/')) continue
    const itemName = name.substring('item/'.length)
    if (!blockstatesModels.latestRootItems.includes(itemName)) {
        continue
    }
    let texturesCount = 0
    const collectParent = (model) => {
        if (model.parent) {
            if (model.parent.startsWith('block/')) return false
            collectParent(blockstatesModels.models.latest[model.parent] ?? {})
        }
        if (model.textures) {
            texturesCount += Object.keys(model.textures).length
        }
        return
    }
    const result = collectParent(data)
    if (result === false) continue
    if (texturesCount > 1) {
        console.log(name)
    }
}
