import fs from 'fs'
import path from 'path'

const dataPaths = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))

// iterate over all versions
const customModelsPath = path.join('./custom/blockentities')
const customModelsVersions = fs.readdirSync(customModelsPath)

const customData = {
    blockStates: {},
    blockModels: {}
}

const existingPaths = {
    blockStates: dataPaths.latest['blockstates/'],
    blockModels: dataPaths.latest['models/'],
}

for (const version of customModelsVersions) {
    const collectFiles = (dir: string, type: keyof typeof customData) => {
        const files = fs.readdirSync(dir, { withFileTypes: true })
        for (const file of files) {
            const fileName = file.name
            if (file.isDirectory()) {
                collectFiles(path.join(dir, fileName), type)
                continue
            }
            const filePath = path.join(dir, fileName)
            if (fileName.endsWith('.json')) {
                const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))
                if (json.parent && !json.parent.startsWith('block/')) json.parent = `block/${json.parent}`
                fs.writeFileSync(filePath, JSON.stringify(json, null, 4))
                customData[type][version] ??= {}
                const nameClean = fileName.replace('.json', '');
                if (customData[type][version]![nameClean]) {
                    throw new Error(`Duplicate ${type} name ${nameClean} in ${dir}`)
                }
                customData[type][version]![nameClean] = true
                existingPaths[type][nameClean] = undefined
                // TODO drop existing for all versions
                const refNameRaw = filePath.slice(filePath.indexOf(type) + type.length + 1);
                const refName = type === 'blockModels'
                    ? refNameRaw.startsWith('block/') ? refNameRaw : `block/${refNameRaw}` // e.g. block/sign/oak_sign // e.g. block/sign/oak_sign
                    : nameClean // e.g. oak_sign (just block name) // e.g. oak_sign (just block name) // e.g. oak_sign (just block name)
                existingPaths[type][`${refName}.json`] = `../${filePath}`
            }
        }
    }
    collectFiles(path.join(customModelsPath, version, 'blockStates'), 'blockStates')
    collectFiles(path.join(customModelsPath, version, 'blockModels'), 'blockModels')
}

fs.writeFileSync('./data/data-paths.json', JSON.stringify(dataPaths, null, 4), 'utf8')
