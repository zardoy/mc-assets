import { BlockModelsStore, BlockStatesStore } from './stores'
import { BlockApplyModel, BlockElementPos, BlockModel, BlockStateConditions, ItemModel } from './types'

export interface QueriedBlock {
    stateId: number
    name: string
    properties: {
        [name: string]: string | boolean | number
    }
}

const getNamespace = (name: string) => {
    const parts = name.split(':')
    if (parts.length === 1) return 'minecraft'
    if (parts.length === 2) return parts[0]
    return parts.slice(0, -1).join(':')
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

    public issues: string[] = []
    public matchedModels: string[] = []
    public matchedConditions: string[] = []
    private getModelsByBlock(queriedBlock: Omit<QueriedBlock, 'stateId'>, fallbackVariant: boolean, multiOptim: boolean) {
        this.matchedModels = []
        this.matchedConditions = []
        const matchProperties = (block: Pick<QueriedBlock, 'properties'>, /* to match against */properties: string | (Record<string, string | boolean> & { OR?, AND?})) => {
            if (!properties) { return true }

            if (typeof properties === 'string') {
                properties = this.parseProperties(properties)
            }
            const blockProps = block.properties
            if (properties.OR) {
                return properties.OR.some((or) => matchProperties(block, or))
            }
            if (properties.AND) {
                return properties.AND.every((and) => matchProperties(block, and))
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
        if (!blockStates) {
            this.issues.push(`Block ${queriedBlock.name} not found in all registered blockstates. Place it into assets/${getNamespace(queriedBlock.name)}/blockstates/${queriedBlock.name}.json`)
            return
        }
        const states = blockStates.variants
        let stateMatched = false
        if (states) {
            let state = states[''] || states['normal']
            for (const key in states) {
                if (key === '') continue
                if (matchProperties(queriedBlock, key)) {
                    state = states[key]
                    break
                }
            }
            if (state) {
                const matchedStateName = Object.entries(states).find(([key]) => state === states[key])?.[0]
                this.matchedConditions.push(`variant:${matchedStateName}`)
            }
            if (!state) {
                if (fallbackVariant) {
                    const firstKey = Object.keys(states)[0]!
                    state = states[firstKey]
                    this.matchedConditions.push(`fallback:${firstKey}`)
                } else {
                    return
                }
            }
            if (state) {
                applyModels.push(state)
                stateMatched = true
            }
        }
        if (blockStates.multipart) {
            for (const { when, apply } of blockStates.multipart) {
                if (!when || matchProperties(queriedBlock, when as any)) {
                    applyModels.push(apply)
                    this.matchedConditions.push(when ? `multipart:${JSON.stringify(when)}` : 'multipart:always')
                }
            }
            if (!applyModels.length && fallbackVariant) {
                const multipartWithWhen = blockStates.multipart.filter(x => x.when)
                const apply = multipartWithWhen[0]?.apply
                if (apply) {
                    applyModels.push(apply)
                    this.matchedConditions.push('multipart:fallback')
                }
            }
        }
        if (!applyModels.length) {
            if (!stateMatched) {
                const blockstatesCount = Object.keys(states ?? {}).length
                if (blockstatesCount) {
                    this.issues.push(`Block did not match any possible state (${blockstatesCount} possible states)`)
                } else {
                    this.issues.push(`Blockstates for ${queriedBlock.name} are not defined`)
                }
            }
            return
        }
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

    private getModelData(model: string) {
        const modelData = this.blockModelsStore.get(this.version, model)
        return modelData && typeof modelData === 'object' ? structuredClone(modelData) : modelData
    }

    public getResolvedModelsByModel(model: string, debugQueryName?: string, clearModel = true) {
        if (clearModel) {
            this.resolvedModel = {}
        }
        const modelData = this.getModelData(model)
        if (!modelData) {
            this.issues.push(`Model ${model} not found. Ensure it is present in assets/${getNamespace(model)}/models/${model}.json`)
            return
        }
        this.matchedModels.push(model)
        return this.getResolvedModelsByModelData(modelData, debugQueryName, clearModel)
    }

    public getResolvedModelsByModelData(modelData: BlockModel, debugQueryName?: string, clearModel = true) {
        if (clearModel) {
            this.resolvedModel = {}
        }
        const collectedParentModels = [] as BlockModel[]
        const collectModels = (model: BlockModel) => {
            collectedParentModels.push(model)

            if (model.parent) {
                const parent = this.getModelData(model.parent)
                if (!parent) {
                    this.issues.push(`Parent model ${model.parent} not found for ${debugQueryName}`)
                    return
                }
                this.matchedModels.push(`parent:${model.parent}`)
                collectModels(parent)
            }
        }
        collectModels(modelData)
        collectedParentModels.reverse() // from parent to child
        for (const model of collectedParentModels) {
            if (model.textures) {
                this.resolvedModel.textures ??= {}
                for (let [key, value] of Object.entries(model.textures)) {
                    if (value.includes('#')) value = value.split('/').at(-1)!
                    if (value.startsWith('#')) {
                        const key = value.slice(1)
                        if (this.resolvedModel.textures[key]) {
                            value = this.resolvedModel.textures[key]!
                        }
                    }
                    this.resolvedModel.textures[key] = value
                }
            }

            if (model.elements) {
                this.resolvedModel.elements = model.elements
            }

            for (const [key, value] of Object.entries(model)) {
                if (key !== 'elements' && key !== 'textures' && key !== 'parent') {
                    if (this.resolvedModel[key] && typeof this.resolvedModel[key] === 'object' && value && typeof value === 'object') {
                        Object.assign(this.resolvedModel[key], value)
                    } else {
                        this.resolvedModel[key] = value
                    }
                }
            }
        }

        const resolveTexture = (originalTexturePath: string, _originalKey: string, chain: string[]) => {
            chain.push(_originalKey)
            if (originalTexturePath.includes('#')) {
                originalTexturePath = originalTexturePath.split('/').at(-1)!.replace('#', '')
                this.resolvedModel.textures ??= {}
                if (chain.includes(originalTexturePath)) {
                    this.issues.push(`${debugQueryName}: Circular texture reference detected: ${chain.join(' -> ')}`)
                    return
                }
                const existingKey = this.resolvedModel.textures[originalTexturePath]
                if (!existingKey) {
                    this.issues.push(`${debugQueryName}: Cannot resolve texture ${originalTexturePath} for ${_originalKey} because it is not defined`)
                    return
                } else {
                    return resolveTexture(existingKey, originalTexturePath, chain)
                }
            }
            return originalTexturePath
        }
        for (let [key, value] of Object.entries(this.resolvedModel.textures ?? {})) {
            if (!value.includes('#')) continue
            const resolved = resolveTexture(value, key, [])
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
