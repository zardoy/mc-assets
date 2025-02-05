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

    tryGetFullBlock(blockName: string, properties: Record<string, string | boolean> = {}) {
        if (!this.blocksAtlasParser) return
        const resolvedModelParts = this.assetsParser.getResolvedModelFirst({
            name: blockName,
            properties,
        }, true)
        const resolvedModel = resolvedModelParts?.[0]
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
        }
    }

    getItemTexture(itemNameOrModel: string, properties: Record<string, string | boolean> = {}, exactItemResolve = false) {
        itemNameOrModel = itemNameOrModel.replace(/^minecraft:/, '')
        let model: ItemModel | undefined
        if (itemNameOrModel.includes('/') || exactItemResolve) {
            model = this.modelsStore.get(this.version, itemNameOrModel)
        } else {
            model = this.modelsStore.get(this.version, `item/${itemNameOrModel}`)
            if (!model || model.parent?.includes('block/')) {
                return this.tryGetFullBlock(itemNameOrModel, properties)
            }
        }
        if (!model) return
        const texture = itemNameOrModel.includes('block/') ?
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
