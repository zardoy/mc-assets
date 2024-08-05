import fs from 'fs'
import { VersionedStore } from './consumer/versionedStore'
import { versionToNumber } from './consumer/utils'
import path from 'path/posix'
import { BlockModel, BlockStates, ItemModel } from './consumer/types'


const normalizeModelString = (str: string) => {
    str = str.replace(/^(minecraft:)/, '');
    if (!str.startsWith('block/') && !str.startsWith('item/')) {
        str = 'block/' + str
    }
    return str
}
export const normalizeModel = (model: BlockModel | ItemModel) => {
    model.parent = model.parent?.replace(/^(minecraft:)/, '')
    for (const [key, value] of Object.entries(model.textures ?? {})) {
        model.textures![key] = normalizeModelString(value)
    }
    if ('overrides' in model) {
        for (const override of model.overrides!) {
            override.model = normalizeModelString(override.model)
        }
    }
}

export const normalizeBlockStates = (states: BlockStates) => {
    if (states.variants) {
        for (const [key, variant] of Object.entries(states.variants)) {
            if (Array.isArray(variant)) {
                if (variant.length === 0) throw new Error(`Empty variants array in ${key}`)
                for (const v of variant) {
                    v.model = normalizeModelString(v.model)
                    // validate model
                }
            } else {
                variant.model = normalizeModelString(variant.model)
                // validate model
            }
        }
    }
    if (states.multipart) {
        if (states.multipart.length === 0) states.multipart = undefined
        for (const part of states.multipart ?? []) {
            if (Array.isArray(part.apply)) {
                for (const v of part.apply) {
                    v.model = normalizeModelString(v.model)
                    // validate model
                }
            } else {
                part.apply.model = normalizeModelString(part.apply.model)
                // validate model
            }
        }
    }
}

export const validateBlockStates = (states: Record<string, BlockStates>, models: Record<string, BlockModel | ItemModel>) => {
    for (const [key, state] of Object.entries(states)) {
        if (state.multipart) {
            for (const part of state.multipart) {
                if (Array.isArray(part.apply)) {
                    for (const v of part.apply) {
                        if (!models[v.model]) {
                            throw new Error(`Model ${v.model} doesn't exist`)
                        }
                    }
                } else {
                    if (!models[part.apply.model]) {
                        throw new Error(`Model ${part.apply.model} doesn't exist`)
                    }
                }
            }
        } else if (state.variants) {
            for (const variant of Object.values(state.variants)) {
                if (Array.isArray(variant)) {
                    for (const v of variant) {
                        if (!models[v.model]) {
                            throw new Error(`Model ${v.model} doesn't exist`)
                        }
                    }
                } else {
                    if (!models[variant.model]) {
                        throw new Error(`Model ${variant.model} doesn't exist`)
                    }
                }
            }
        }
    }
}

export const validateModels = (models: Record<string, BlockModel | ItemModel>, textures = {}, hardcodedModels = {}) => {
    // validate parents & textures
    for (const [key, model] of Object.entries(models)) {
        const validateModelString = (model: string, message: string) => {
            if (model === 'builtin/entity' || model === 'item/generated' || model === 'builtin/generated') {
                hardcodedModels[key] = model
                return
            }
            if (!models[model]) {
                throw new Error(message)
            }
        }

        if (model.parent) {
            if (!models[model.parent]) {
                validateModelString(model.parent, `Model ${key} has parent model ${model.parent} but it doesn't exist`)
            }
        }

        if ('overrides' in model) {
            for (const override of model.overrides!) {
                if (!models[override.model]) {
                    validateModelString(override.model, `Model ${key} has override with model ${override.model} but it doesn't exist`)
                }
            }
        }

        // const textures = model.textures ?? {}
        // for (const [textureKey, texture] of Object.entries(textures)) {
        //     if (!models[texture]) {
        //         throw new Error(`Model ${key} has texture ${textureKey} but it doesn't exist`)
        //     }
        // }
    }
}

export const buildBlocksStatesModels = () => {
    const VERSION_CLIP = versionToNumber('1.13')

    const dataPaths = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))
    const keys = ['blockstates/', 'models/']
    const keyOutput = ['blockstates', 'models']

    let assetsOutput = {} as Record<string, Record<string, Record<string, any>>>
    assetsOutput.hardcodedModels = {}
    for (const key of keys) {
        const outputKey = keyOutput[keys.indexOf(key)]!
        assetsOutput[outputKey] = {}
        const processByVersion = (ver: string) => {
            const data = dataPaths[ver][key]
            if (!data) return
            assetsOutput[outputKey]![ver] = {}
            for (const [fileName, filePath] of Object.entries(data)) {
                const verNum = versionToNumber(filePath.split('/')[0]!)
                // if (verNum < VERSION_CLIP) {
                //     continue
                // }
                const json = JSON.parse(fs.readFileSync(path.join('data', filePath), 'utf8'));
                if (key === 'blockstates/') {
                    normalizeBlockStates(json)
                } else {
                    normalizeModel(json)
                }
                const name = fileName.replace('.json', '');
                if (name === 'item/generated') continue
                assetsOutput[outputKey]![ver]![name] = json
            }
        }
        for (const ver of Object.keys(dataPaths)) {
            if (versionToNumber(ver) < VERSION_CLIP) continue
            processByVersion(ver)
        }
    }

    validateBlockStates(assetsOutput.blockstates!.latest!, assetsOutput.models!.latest!)
    validateModels(assetsOutput.models!.latest!, {}, assetsOutput.hardcodedModels as any)

    fs.mkdirSync('./dist', { recursive: true })
    fs.writeFileSync('./temp/blockStatesModels.json', JSON.stringify(assetsOutput, null, 4))
}

buildBlocksStatesModels()
