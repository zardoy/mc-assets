import { VersionedStore } from './versionedStore'
import { makeTextureAtlas } from './atlasCreator'
import { getLoadedImage } from './utils'

type Texture = {
    u: number
    v: number
    tileIndex: number
    su?: number
    sv?: number
}

/**
 * @unstable
 */
export interface ItemsAtlasesOutputJson {
    textures: Record<string, Texture>
    width: number
    height: number
    tileSize: number
    suSv: number
}

interface ItemsAtlases {
    latest: ItemsAtlasesOutputJson
    legacy?: ItemsAtlasesOutputJson
}

type StoreType = Texture & { imageType: 'latest' | 'legacy', version: string }
type DataUrl = string
export class AtlasParser {
    atlasStore: VersionedStore<StoreType>
    itemsCanvas
    atlasHasLegacyImage: boolean

    constructor(
        public atlasJson: any,
        public latestImage: string,
        public legacyImage?: string
    ) {
        this.atlasStore = new VersionedStore<StoreType>()
        this.atlasStore.inclusive = false
        const itemsAtlases = atlasJson as ItemsAtlases
        const addByVersion = (store: VersionedStore<StoreType>, version: string, textures: Record<string, Texture>, imageName: 'latest' | 'legacy') => {
            for (const [key, path] of Object.entries(textures)) {
                store.push(version, key, {...path, version, imageType: imageName})
            }
        }
        addByVersion(this.atlasStore, 'latest', itemsAtlases.latest.textures, 'latest')
        this.atlasHasLegacyImage = !!legacyImage
        if (legacyImage && itemsAtlases.legacy) {
            for (const key of Object.keys(itemsAtlases.legacy.textures)) {
                const [version, name] = key.split('/')
                addByVersion(this.atlasStore, version!, { [name!]: itemsAtlases.legacy.textures[key]! }, 'legacy')
            }
        }
    }

    get atlas() {
        return this.atlasJson as ItemsAtlases
    }

    getTextureInfo(itemName: string, version = 'latest') {
        const info = this.atlasStore.get(version, itemName);
        if (!info) return
        const defaultSuSv = (info.imageType === 'latest' ? this.atlas.latest : this.atlas.legacy!).suSv
        return {
            ...info,
            su: info?.su ?? defaultSuSv,
            sv: info?.sv ?? defaultSuSv,
            getLoadedImage: async () => {
                return await getLoadedImage(info.imageType === 'latest' ? this.latestImage : this.legacyImage!)
            }
        }
    }

    async makeNewAtlas(version: string, getCustomImage?: (itemName: string) => DataUrl | HTMLImageElement | boolean | void, tileSize = this.atlas.latest.tileSize) {
        const itemsAtlases = this.atlasJson as ItemsAtlases
        type CoordsAndImage = {
            u: number
            v: number
            su: number
            sv: number
            img: HTMLImageElement
        }
        const newTextures: Record<string, CoordsAndImage> = {}
        const legacyImg = this.atlasHasLegacyImage ? await getLoadedImage(this.legacyImage!) : null
        const latestImg = await getLoadedImage(this.latestImage)
        for (const [itemName, texture] of Object.entries(itemsAtlases.latest.textures)) {
            const customImage = getCustomImage?.(itemName)
            if (customImage === false) continue
            if (customImage && customImage !== true) {
                const img = typeof customImage === 'string' ? await getLoadedImage(customImage) : customImage
                newTextures[itemName] = {
                    u: 0,
                    v: 0,
                    su: 1,
                    sv: 1,
                    img
                }
                continue
            }
            const info = this.getTextureInfo(itemName, version)
            if (!info) throw new Error(`Missing texture info for ${itemName}`)
            const { u, v, su, sv } = info
            const atlas = info.version === 'latest' ? itemsAtlases.latest : itemsAtlases.legacy!
            const image = info.imageType === 'latest' ? latestImg : legacyImg
            if (!image) throw new Error(`Missing image for ${itemName}`)
            newTextures[itemName] = {
                u,
                v,
                su: su ?? atlas.suSv,
                sv: sv ?? atlas.suSv,
                img: image
            }
        }

        const { json, canvas } = makeTextureAtlas({
            input: Object.keys(newTextures),
            getLoadedImage: (name) => {
                const texture = newTextures[name]!
                const image = texture.img
                const imgSize = image.width
                //@ts-ignore we no longer need the image, remove from atlas
                delete texture.img
                return {
                    image,
                    renderWidth: texture.su * imgSize,
                    renderHeight: texture.sv * imgSize,
                    renderSourceStartX: texture.u * imgSize,
                    renderSourceStartY: texture.v * imgSize,
                    renderSourceWidth: texture.su * imgSize,
                    renderSourceHeight: texture.sv * imgSize,
                }
            },
            tileSize: this.atlas.latest.tileSize,
        })

        let _newAtlasParser: AtlasParser | undefined
        return {
            canvas,
            atlas: json,
            get newAtlasParser() {
                if (!_newAtlasParser) {
                    _newAtlasParser = new AtlasParser({ latest: json }, canvas.toDataURL())
                }
                return _newAtlasParser
            },
            get image() {
                return canvas.toDataURL()
            }
        }
    }

    // getTextureBase64(version: string, itemName: string) {
    //     if (type === 'item') {
    //         return this.itemsAtlasStore.get(version, itemName)
    //     } else if (type === 'block') {
    //         return this.blocksAtlasStore.get(version, itemName)
    //     }
    //     throw new Error(`unknown get type ${type}`)
    // }
}
