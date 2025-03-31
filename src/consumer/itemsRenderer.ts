import { AtlasParser } from './atlasParser';
import { AssetsParser } from './assetsParser';
import { BlockModelsStore, BlockStatesStore, getLoadedBlockstatesStore, getLoadedModelsStore } from './stores';
import { BlockModel, ItemModel } from './types';

type TextureSlice = [absoluteX: number, absoluteY: number, width: number, height: number]

export class ItemsRenderer {
    blockStatesStore: BlockStatesStore
    modelsStore: BlockModelsStore
    assetsParser: AssetsParser

    constructor(public version: string, blockstatesModels: any, public itemsAtlasParser: AtlasParser, public blocksAtlasParser?: AtlasParser) {
        this.blockStatesStore = getLoadedBlockstatesStore(blockstatesModels)
        this.modelsStore = getLoadedModelsStore(blockstatesModels)
        this.assetsParser = new AssetsParser(version, this.blockStatesStore, this.modelsStore)
    }

    resolveTexture(texture: string) {
        if (texture.startsWith('minecraft:')) {
            texture = texture.slice('minecraft:'.length)
        }
        const type = texture.includes('items/') ? 'items' : (texture.includes('block/') || texture.includes('blocks/')) ? 'blocks' : 'items'
        const atlasParser = type === 'blocks' ? this.blocksAtlasParser! : this.itemsAtlasParser
        const textureInfo = atlasParser.getTextureInfo(texture.replace('block/', '').replace('blocks/', '').replace('item/', '').replace('items/', ''), this.version)!
        if (!textureInfo) return
        const atlas = atlasParser.atlas[textureInfo.imageType]!
        return {
            slice: [
                textureInfo.u * atlas.width,
                textureInfo.v * atlas.height,
                textureInfo.su * atlas.width,
                textureInfo.sv * atlas.height
            ] satisfies TextureSlice,
            type,
            /** @deprecated */
            path: type
        }
    }

    resolveBlockModel(model: any, blockName: string) {
        if (!this.blocksAtlasParser) return
        const { resolvedModel } = this.assetsParser.getResolvedModelsByModelData(model)
        if (!resolvedModel?.elements?.length) return
        return {
            resolvedModel,
            get top(): string {
                throw new Error('Was called with onlyResolveBlockModel = true')
            },
            get left(): string {
                throw new Error('Was called with onlyResolveBlockModel = true')
            },
            get right(): string {
                throw new Error('Was called with onlyResolveBlockModel = true')
            }
        }
    }

    tryGetFullBlock(model: any, blockName: string) {
        if (!this.blocksAtlasParser) return
        const { resolvedModel } = this.assetsParser.getResolvedModelsByModelData(model)
        if (!resolvedModel?.elements?.length) return
        const isAllFullModels = resolvedModel.elements.every(elem => elem.from[0] === 0 && elem.from[1] === 0 && elem.from[2] === 0 && elem.to[0] === 16 && elem.to[1] === 16 && elem.to[2] === 16)
        if (!isAllFullModels) return
        const elem = resolvedModel.elements[0]!
        const topTexture = elem.faces.up?.texture ?? elem.faces.top?.texture!
        const leftTexture = elem.faces.east?.texture ?? elem.faces.left?.texture ?? elem.faces.side?.texture!
        const rightTexture = elem.faces.north?.texture ?? elem.faces.right?.texture ?? elem.faces.side?.texture!
        if (!topTexture || !leftTexture || !rightTexture) return
        const topTextureResolved = this.resolveTexture(topTexture);
        if (!topTextureResolved) throw new Error(`Missing texture for ${blockName} top texture`)
        const leftTextureResolved = this.resolveTexture(leftTexture);
        if (!leftTextureResolved) throw new Error(`Missing texture for ${blockName} left texture`)
        const rightTextureResolved = this.resolveTexture(rightTexture);
        if (!rightTextureResolved) throw new Error(`Missing texture for ${blockName} right texture`)
        return {
            top: topTextureResolved,
            left: leftTextureResolved,
            right: rightTextureResolved,
            resolvedModel: resolvedModel as BlockModel
        }
    }

    getItemTexture(itemNameOrModel: string, _properties: Record<string, string | boolean> = {}, exactItemResolve = false, onlyResolveBlockModel = false) {
        let [_namespace, _name] = itemNameOrModel.includes(':') ? itemNameOrModel.split(':') : ['minecraft', itemNameOrModel]
        const namespace = _namespace === 'minecraft' ? '' : _namespace!
        const name = _name!
        const itemModelPath = namespace ? `${namespace}:item/${name}` : `item/${name}`
        const blockModelPath = namespace ? `${namespace}:block/${name}` : `block/${name}`
        const cleanFullModelPath = namespace ? `${namespace}:${name}` : name

        const resolveModel = (path: string) => {
            // todo resolve deep
            return this.modelsStore.get(this.version, path)
        }

        let model: ItemModel | undefined
        {
            model = resolveModel(cleanFullModelPath)
            if (!exactItemResolve && !model) {
                // todo resolve deep!
                const itemModel = resolveModel(itemModelPath)
                if (itemModel && itemModel.textures?.layer0) {
                    model = itemModel
                }
            }
            let blockModel = model?.parent?.includes('block/')
            if (!model) {
                if (onlyResolveBlockModel && !namespace) {
                    const [resolvedModel] = this.assetsParser.getResolvedModelFirst({ name: name, properties: {} }, true) ?? []
                    if (resolvedModel) {
                        return {
                            resolvedModel,
                            get top(): string {
                                throw new Error('Was called with onlyResolveBlockModel = true')
                            },
                            get left(): string {
                                throw new Error('Was called with onlyResolveBlockModel = true')
                            },
                            get right(): string {
                                throw new Error('Was called with onlyResolveBlockModel = true')
                            }
                        }
                    }
                } else {
                    model = resolveModel(blockModelPath)
                    if (model) blockModel = true
                }
            }
            if (blockModel || model?.elements) {
                return onlyResolveBlockModel ? this.resolveBlockModel(model, cleanFullModelPath) : this.tryGetFullBlock(model, cleanFullModelPath)
            }
        }
        if (!model) return
        const texture = cleanFullModelPath.includes('block/') ?
            // first defined block texture
            Object.values(model.textures ?? {})[0] :
            model.textures?.layer0 // classic item texture
        if (!texture) return
        return (texture.startsWith('invsprite_') ? this.resolveTexture(texture.replace('invsprite_', '')) : undefined)
            ?? this.resolveTexture(texture)
        // const {resolvedModel} = this.assetsParser.getResolvedModelByModelName('item/' + itemName, itemName) ?? {}
        // resolvedModel?.textures['layer0']
    }
}
