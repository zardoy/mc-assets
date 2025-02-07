import { AtlasParser } from './atlasParser'
import { AssetsParser, QueriedBlock } from './assetsParser'
import { getLoadedBlockstatesStore, getLoadedModelsStore } from './stores'
import { BlockModel } from './types'

export default function worldBlockProvider(blockstatesModels: any, blocksAtlas: any, version: string) {
    const blockStatesStore = getLoadedBlockstatesStore(blockstatesModels)
    const blockModelsStore = getLoadedModelsStore(blockstatesModels)

    const assetsParser = new AssetsParser(version, blockStatesStore, blockModelsStore)
    const atlasParser = new AtlasParser(blocksAtlas, 'latest', 'legacy')

    type ResolveModelReturnType = NonNullable<ReturnType<typeof assetsParser.getAllResolvedModels>>

    const getTextureInfo = (textureName: string) => {
        return atlasParser.getTextureInfo(textureName.replace('block/', '').replace('blocks/', ''), version)
    }

    const transformModel = <T extends BlockModel | ResolveModelReturnType[number][number]>(model: T, block: Omit<QueriedBlock, 'stateId'>) => {
        const { elements, textures, ...rest } = model
        return {
            // todo validate elements
            elements: elements!?.map((elem) => {
                return {
                    ...elem,
                    faces: Object.fromEntries(Object.entries(elem.faces).map(([faceName, face]) => {
                        const texture = face.texture
                        if (!texture) throw new Error(`Missing resolved texture ${texture} for face ${faceName} of ${block.name}`)
                        const finalTexture = getTextureInfo(texture)
                        if (!finalTexture) throw new Error(`Missing texture data ${texture} for ${block.name}`)

                        const _from = elem.from
                        const _to = elem.to
                        // taken from https://github.com/DragonDev1906/Minecraft-Overviewer/
                        const COORDINATE_MAX = 16
                        const uv = (face.uv || {
                            // default UVs
                            // format: [u1, v1, u2, v2] (u = x, v = y)
                            north: [_to[0], COORDINATE_MAX - _to[1], _from[0], COORDINATE_MAX - _from[1]],
                            east: [_from[2], COORDINATE_MAX - _to[1], _to[2], COORDINATE_MAX - _from[1]],
                            south: [_from[0], COORDINATE_MAX - _to[1], _to[0], COORDINATE_MAX - _from[1]],
                            west: [_from[2], COORDINATE_MAX - _to[1], _to[2], COORDINATE_MAX - _from[1]],
                            up: [_from[0], _from[2], _to[0], _to[2]],
                            down: [_to[0], _from[2], _from[0], _to[2]]
                        }[faceName]!) as [number, number, number, number]

                        const su = (uv[2] - uv[0]) / COORDINATE_MAX * finalTexture.su
                        const sv = (uv[3] - uv[1]) / COORDINATE_MAX * finalTexture.sv

                        return [faceName, {
                            ...face,
                            texture: {
                                u: finalTexture.u + uv[0] / 16 * finalTexture.su,
                                v: finalTexture.v + uv[1] / 16 * finalTexture.sv,
                                su,
                                sv,
                                tileIndex: finalTexture.tileIndex,
                                debugName: texture,
                            },
                        }]
                    }))
                }
            }),
            ...rest
        }
    }

    return {
        getAllResolvedModels0_1(block: Omit<QueriedBlock, 'stateId'>, fallbackVariant = false) {
            const modelsParts = assetsParser.getAllResolvedModels(block, fallbackVariant) ?? []

            const interestedFaces = ['north', 'east', 'south', 'west', 'up', 'down']

            return modelsParts.map(modelVariants => {
                return modelVariants.map(model => {
                    return transformModel(model, block);
                }).filter(a => a.elements?.length)
            }).filter(a => a.length)
        },
        transformModel,
        getTextureInfo
    }
}

export type WorldBlockProvider = ReturnType<typeof worldBlockProvider>
