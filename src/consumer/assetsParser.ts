import { BlockModelsStore, BlockStatesStore } from './stores'
import { BlockApplyModel, BlockElementPos, BlockModel, BlockStateConditions, ItemModel } from './types'

export interface QueriedBlock {
    stateId: number
    name: string
    properties: {
        [name: string]: string | boolean | number
    }
}

export type BlockElement = [from: BlockElementPos, to: BlockElementPos]
export class AssetsParser {
    stateIdToElements: Record<string, BlockElement[] | 1> = {} // 1 is a special case for full blocks

    constructor(public version: string, public blockStatesStore: BlockStatesStore, public blockModelsStore: BlockModelsStore) {
    }

    getElementsCached(queriedBlock: QueriedBlock) {
        const { stateId } = queriedBlock
        if (this.stateIdToElements[stateId]) return this.stateIdToElements[stateId]

        const result = this.getElements(queriedBlock)
        const final = result === 0 ? [] : result
        this.stateIdToElements[stateId] = final as 1 | BlockElement[]
        return final
    }

    parseProperties(properties: string) {
        if (typeof properties === 'object') { return properties }

        const json = {} as Record<string, string | boolean>
        for (const prop of properties.split(',')) {
            const [key, value] = prop.split('=')
            json[key!] = value!
        }
        return json
    }

    getElements(queriedBlock: Omit<QueriedBlock, 'stateId'>, fallbackVariant = false) {
        const model = this.getResolvedModelFirst(queriedBlock, fallbackVariant)
        if (!model) return 0
        const allElements = [] as BlockElement[]
        for (const m of model) {
            if (!m?.elements) continue
            allElements.push(...m.elements.map(({ from, to }) => [from, to] as BlockElement))
        }
        const elementsOptimized = allElements.length === 1 && arrEq(allElements[0]![0], [0, 0, 0]) && arrEq(allElements[0]![1], [16, 16, 16]) ? 1 : allElements
        return elementsOptimized
    }

    // looks like workaround
    private resolvedModel: Pick<BlockModel, 'textures' | 'ao' | 'elements'> & { x?: number, y?: number, z?: number, uvlock?: boolean, weight?: number } = {}

    private getModelsByBlock(queriedBlock: Omit<QueriedBlock, 'stateId'>, fallbackVariant: boolean, multiOptim: boolean) {
        const matchProperties = (block: Pick<QueriedBlock, 'properties'>, /* to match against */properties: string | (Record<string, string | boolean> & { OR?})) => {
            if (!properties) { return true }

            if (typeof properties === 'string') {
                properties = this.parseProperties(properties)
            }
            const blockProps = block.properties
            if (properties.OR) {
                return properties.OR.some((or) => matchProperties(block, or))
            }
            for (const prop in properties) {
                if (typeof properties[prop] !== 'string') properties[prop] = String(properties[prop])
                if (!(properties[prop] as string).split('|').some((value) => value === String(blockProps[prop]))) {
                    return false
                }
            }
            return true
        }

        let applyModels = [] as BlockApplyModel[]
        const blockStates = this.blockStatesStore.get(this.version, queriedBlock.name)
        if (!blockStates) return
        const states = blockStates.variants
        if (states) {
            let state = states[''] || states['normal']
            for (const key in states) {
                if (key === '') continue
                if (matchProperties(queriedBlock, key)) {
                    state = states[key]
                    break
                }
            }
            if (!state) {
                if (fallbackVariant) {
                    state = states[Object.keys(states)[0]!]
                } else {
                    return
                }
            }
            if (state) {
                applyModels.push(state)
            }
        }
        if (blockStates.multipart) {
            for (const { when, apply } of blockStates.multipart) {
                if (!when || matchProperties(queriedBlock, when as any)) {
                    applyModels.push(apply)
                }
            }
            if (!applyModels.length && fallbackVariant) {
                const multipartWithWhen = blockStates.multipart.filter(x => x.when);
                const apply = multipartWithWhen[0]?.apply
                if (apply) {
                    applyModels.push(apply)
                }
            }
        }
        if (!applyModels.length) return
        const modelsResolved = [] as typeof this.resolvedModel[][]
        let part = 0
        for (const model of applyModels) {
            part++
            let variant = 0
            modelsResolved.push([])
            for (const varModel of Array.isArray(model) ? model : [model]) {
                variant++
                this.resolvedModel = {
                    x: varModel.x,
                    y: varModel.y,
                    z: varModel.z,
                    uvlock: varModel.uvlock,
                    weight: varModel.weight,
                }
                if (!varModel) continue
                this.getResolvedModelsByModel(varModel.model, queriedBlock.name + '-' + part + '-' + variant, false)
                // if (!result || Object.keys(result).length === 0) continue // todo: maybe we should push null?
                modelsResolved[modelsResolved.length - 1]!.push(this.resolvedModel)
                if (!multiOptim && modelsResolved[modelsResolved.length - 1]!.length > 0) break
            }
        }
        return modelsResolved // todo figure out the type error
    }

    private getResolvedModelsByModel(model: string, debugQueryName?: string, clearModel = true) {
        if (clearModel) {
            this.resolvedModel = {}
        }
        const modelData = this.blockModelsStore.get(this.version, model)
        if (!modelData) return
        const resolveModel = (model: BlockModel) => {
            if (model.ambientocclusion !== undefined) {
                this.resolvedModel.ao = model.ambientocclusion
            }
            if (model.ao !== undefined) {
                this.resolvedModel.ao = model.ao
            }

            if (model.textures) {
                this.resolvedModel.textures ??= {}
                Object.assign(this.resolvedModel.textures, model.textures)
            }

            if (model.elements) {
                this.resolvedModel.elements ??= []
                this.resolvedModel.elements.push(...structuredClone(model.elements))
            }

            if (model.parent) {
                const parent = this.blockModelsStore.get(this.version, model.parent)
                if (!parent) return
                resolveModel(parent)
            }
            return model
        }
        resolveModel(modelData)
        const resolveTexture = (originalTexturePath: string, _originalKey: string) => {
            if (originalTexturePath.includes('#')) {
                originalTexturePath = originalTexturePath.split('/').at(-1)!.replace('#', '')
                this.resolvedModel.textures ??= {}
                const existingKey = this.resolvedModel.textures[originalTexturePath]
                if (!existingKey) {
                    // todo this also needs to be done at the validation stage
                    // throw new Error(`Cannot resolve texture ${key} to ${value} because it is not defined`)
                    console.warn(`${debugQueryName}: Cannot resolve texture ${originalTexturePath} for ${_originalKey} because it is not defined`)
                } else {
                    return existingKey
                }
            }
            return
        }
        for (let [key, value] of Object.entries(this.resolvedModel.textures ?? {})) {
            if (!value.includes('#')) continue
            const resolved = resolveTexture(value, key)
            if (resolved) this.resolvedModel.textures![key] = resolved
            else delete this.resolvedModel.textures![key]
        }
        for (const elem of this.resolvedModel.elements ?? []) {
            for (const [faceName, face] of Object.entries(elem.faces ?? {})) {
                if (!face.texture) continue
                // TODO validate at the validation stage
                face.texture = this.resolvedModel.textures![face.texture.replace('#', '')] ?? face.texture
            }
        }
        return {
            resolvedModel: this.resolvedModel,
        }
    }

    getResolvedModelFirst(queriedBlock: Omit<QueriedBlock, 'stateId'>, fallbackVariant = false) {
        return this.getModelsByBlock(queriedBlock, fallbackVariant, false)?.map(x => x[0]!)
    }

    getResolvedModelRandom(queriedBlock: Omit<QueriedBlock, 'stateId'>, fallbackVariant = false) {
        return this.getModelsByBlock(queriedBlock, fallbackVariant, false)?.map(x => x[Math.floor(Math.random() * x.length)]!)
    }

    getAllResolvedModels(queriedBlock: Omit<QueriedBlock, 'stateId'>, fallbackVariant = false) {
        return this.getModelsByBlock(queriedBlock, fallbackVariant, true)
    }
}

const arrEq = <T>(a: T[], b: T[]) => !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i])
