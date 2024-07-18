type ModelBasic = {
    model: string
    x?: number
    y?: number
    uvlock?: boolean
}

export type BlockApplyModel = ModelBasic | (ModelBasic & { weight })[]

type CurrentStateValue = string | 'true' | 'false' | number

export type BlockStateConditions = {
    [name: string]: CurrentStateValue
}

type CurrentStateWhen = string

export type BlockStates = {
    variants?: {
        [name: CurrentStateWhen | ""]: BlockApplyModel
    }
    multipart?: {
        when?: {
            [name: string]: string | number
        } & {
            OR?: BlockStateConditions[]
        }
        apply: BlockApplyModel
    }[]
}

// ---

export type BlockElementPos = [number, number, number]

export type BlockModel = {
    parent?: string
    textures?: {
        [name: string]: string
    }
    elements?: {
        from: BlockElementPos
        to: BlockElementPos
        faces: {
            [name: string]: {
                texture: string
                uv?: number[]
                cullface?: string
            }
        }
    }[]
    ambientocclusion?: boolean
    x?: number
    y?: number
    z?: number
    ao?: boolean
}

type DisplayPresentation = {
    rotation?: [number, number, number]
    translation?: [number, number, number]
    scale?: [number, number, number]
}

// todo improve can have 'builtin/entity' || 'item/generated'
export type ItemModel = BlockModel & {
    overrides?: Array<{
        predicate: {
            [name: CurrentStateWhen]: CurrentStateValue
        }
        model: string
    }>
    display?: {
        thirdperson?: DisplayPresentation
        firstperson?: DisplayPresentation
        gui?: DisplayPresentation
        head?: DisplayPresentation
        ground?: DisplayPresentation
        fixed?: DisplayPresentation
    }
}
