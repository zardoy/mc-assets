// Blocks that render nothing: none of the models their blockstate uses has any elements.
// Vanilla gives block entities (chests, signs, ...) such a model and draws them with code instead,
// so each one needs a custom model in custom/blockentities, or it stays invisible.

/** Blocks meant to render no block model: nothing at all, a fluid, or particles. */
export const INVISIBLE_BLOCKS = ['air', 'cave_air', 'void_air', 'structure_void', 'barrier', 'light', 'moving_piston', 'water', 'lava', 'bubble_column']

type BlockstatesModels = {
    blockstates: Record<string, Record<string, any>>
    models: Record<string, Record<string, any>>
}

const modelNames = (blockstate: any): string[] => {
    const names: string[] = []
    for (const variant of Object.values(blockstate.variants ?? {})) {
        for (const v of [variant].flat() as any[]) names.push(v.model)
    }
    for (const part of blockstate.multipart ?? []) {
        for (const v of [part.apply].flat()) names.push(v.model)
    }
    return names
}

/** Latest blocks whose blockstate models, parents included, have no elements. */
export const getBlocksWithoutGeometry = ({ blockstates, models }: BlockstatesModels) => {
    // latest first, then the newest older version that has the model
    const versions = ['latest', ...Object.keys(models).filter(v => v !== 'latest').reverse()]
    const findModel = (name: string) => {
        const key = name.replace(/^minecraft:/, '').replace(/^(?!block\/|item\/)/, 'block/')
        for (const version of versions) {
            if (models[version]?.[key]) return models[version][key]
        }
        return undefined
    }
    const hasGeometry = (name: string, seen = new Set<string>()): boolean => {
        if (seen.has(name)) return false
        seen.add(name)
        const model = findModel(name)
        if (!model) return false
        if (model.elements?.length) return true
        return model.parent ? hasGeometry(model.parent, seen) : false
    }

    return Object.entries(blockstates.latest!)
        .filter(([, blockstate]) => {
            const names = modelNames(blockstate)
            return names.length > 0 && names.every(name => !hasGeometry(name))
        })
        .map(([name]) => name)
}
