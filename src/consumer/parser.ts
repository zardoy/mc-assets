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
        this.stateIdToElements[stateId] = final
        return final
    }

    // looks like workaround
    private resolvedModel: Pick<BlockModel, 'textures' | 'ao' | 'x' | 'y' | 'z' | 'elements'> = {}

    getElements(queriedBlock: Omit<QueriedBlock, 'stateId'>, fallbackVariant = false) {
        function parseProperties(properties) {
            if (typeof properties === 'object') { return properties }

            const json = {}
            for (const prop of properties.split(',')) {
                const [key, value] = prop.split('=')
                json[key] = value
            }
            return json
        }

        function matchProperties(block: Pick<QueriedBlock, 'properties'>, /* to match against */properties: string | (Record<string, string | boolean> & { OR })) {
            if (!properties) { return true }

            if (typeof properties === 'string') {
                properties = parseProperties(properties) as Record<string, string | boolean> & { OR }
            }
            const blockProps = block.properties
            if (properties.OR) {
                return properties.OR.some((or) => matchProperties(block, or))
            }
            for (const prop in properties) {
                // if (properties[prop] === undefined) continue // unknown property, ignore
                if (typeof properties[prop] !== 'string') properties[prop] = String(properties[prop])
                if (!(properties[prop] as string).split('|').some((value) => value === String(blockProps[prop]))) {
                    return false
                }
            }
            return true
        }

        let modelApply: BlockApplyModel | undefined
        const blockStates = this.blockStatesStore.get(this.version, queriedBlock.name);
        if (!blockStates) return 0
        const states = blockStates.variants
        if (states) {
            let state = states['']
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
                    return 0
                }
            }
            modelApply = state
        }
        if (blockStates.multipart) {
            // TODO! multiple variants
            const multipartWithWhen = blockStates.multipart.filter(x => x.when);
            const multipartWithoutWhen = blockStates.multipart.filter(x => !x.when);
            for (const { when, apply } of multipartWithWhen) {
                if (matchProperties(queriedBlock, when as any)) {
                    modelApply = apply
                }
            }
            if (!modelApply) {
                modelApply = multipartWithoutWhen[0]?.apply
            }
            if (!modelApply && fallbackVariant) {
                modelApply = multipartWithWhen[0]?.apply
            }
        }
        if (!modelApply) return 0
        // const model = Array.isArray(state) ? state[Math.floor(Math.random() * state.length)] : state
        // TODO! not always 0
        const model = (Array.isArray(modelApply) ? modelApply[0]! : modelApply).model
        const modelData = this.blockModelsStore.get(this.version, model)
        if (!modelData) return 0
        // let textures = {} as Record<string, string>
        let elements = [] as BlockElement[]
        const resolveModel = (model: BlockModel) => {
            if (model.elements) {
                elements.push(...model.elements.map(({ from, to }) => [from, to] as BlockElement))
            }

            if (model.ambientocclusion !== undefined) {
                this.resolvedModel.ao = model.ambientocclusion
            }
            if (model.ao !== undefined) {
                this.resolvedModel.ao = model.ao
            }
            if (model.x !== undefined) {
                this.resolvedModel.x = model.x
            }
            if (model.y !== undefined) {
                this.resolvedModel.y = model.y
            }
            if (model.z !== undefined) {
                this.resolvedModel.z = model.z
            }

            if (model.textures) {
                this.resolvedModel.textures ??= {}
                Object.assign(this.resolvedModel.textures, model.textures)
            }

            if (model.elements) {
                this.resolvedModel.elements ??= []
                this.resolvedModel.elements.push(...model.elements)
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
                    console.warn(`${queriedBlock.name}: Cannot resolve texture ${originalTexturePath} for ${_originalKey} because it is not defined`)
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
        return elements.length === 1 && arrEq(elements[0]![0], [0, 0, 0]) && arrEq(elements[0]![1], [16, 16, 16]) ? 1 : elements
    }

    getResolvedModel(queriedBlock: Omit<QueriedBlock, 'stateId'>, fallbackVariant = false) {
        this.resolvedModel = {}
        const elements = this.getElements(queriedBlock, fallbackVariant)
        return {
            ...this.resolvedModel,
            // elements: elements === 0 ? [] : elements === 1 ? [
            //     [[0, 0, 0], [16, 16, 16]]
            // ] : elements,
        }
    }
}

const arrEq = <T>(a: T[], b: T[]) => !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i])

// for each element + texture
