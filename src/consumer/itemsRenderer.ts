import { AtlasParser } from './atlasParser';
import { AssetsParser } from './assetsParser';
import { BlockModelsStore, BlockStatesStore, getLoadedBlockstatesStore, getLoadedModelsStore } from './stores';
import { ItemModel } from './types';

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
        const atlasParser = texture.startsWith('block/') ? this.blocksAtlasParser! : this.itemsAtlasParser
        const type = texture.startsWith('block/') ? 'blocks' : 'items'
        const textureInfo = atlasParser.getTextureInfo(texture.replace('block/', '').replace('blocks/', '').replace('item/', ''), this.version)!
        const atlas = atlasParser.atlas[textureInfo.imageType]!
        return {
            slice: [
                textureInfo.u * atlas.width,
                textureInfo.v * atlas.height,
                textureInfo.su * atlas.width,
                textureInfo.sv * atlas.height
            ] satisfies TextureSlice,
            /** @deprecated */
            path: type,
            type: type
        }
    }

    tryGetFullBlock(blockName: string, properties: Record<string, string | boolean> = {}) {
        if (!this.blocksAtlasParser) return
        const resolvedModelParts = this.assetsParser.getResolvedModelFirst({
            name: blockName,
            properties,
        }, true)
        const resolvedModel = resolvedModelParts?.[0]
        if (resolvedModel?.elements?.length !== 1) return
        const elem = resolvedModel.elements[0]!
        if (elem.from[0] !== 0 || elem.from[1] !== 0 || elem.from[2] !== 0) return
        if (elem.to[0] !== 16 || elem.to[1] !== 16 || elem.to[2] !== 16) return
        const topTexture = elem.faces.up?.texture ?? elem.faces.top?.texture!
        const leftTexture = elem.faces.east?.texture ?? elem.faces.left?.texture ?? elem.faces.side?.texture!
        const rightTexture = elem.faces.north?.texture ?? elem.faces.right?.texture ?? elem.faces.side?.texture!
        return {
            top: this.resolveTexture(topTexture),
            left: this.resolveTexture(leftTexture),
            right: this.resolveTexture(rightTexture),
        }
    }

    getItemTexture(itemName: string, properties: Record<string, string | boolean> = {}) {
        let model: ItemModel | undefined
        if (itemName.includes('/')) {
            model = this.modelsStore.get(this.version, itemName)
        } else {
            model = this.modelsStore.get(this.version, `item/${itemName}`)
            if (!model || model.parent?.startsWith('block/')) {
                return this.tryGetFullBlock(itemName, properties)
            }
        }
        if (!model) return
        const layer0 = model.textures?.layer0
        if (!layer0) return
        return this.resolveTexture(layer0)
        // const {resolvedModel} = this.assetsParser.getResolvedModelByModelName('item/' + itemName, itemName) ?? {}
        // resolvedModel?.textures['layer0']
    }
}
