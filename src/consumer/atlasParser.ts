import { VersionedStore } from './versionedStore'
import { makeTextureAtlas, MAX_CANVAS_SIZE } from './atlasCreator'
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

    async makeNewAtlas(version: string, getCustomImage?: (itemName: string) => DataUrl | HTMLImageElement | boolean | void, _unusedTileSize = this.atlas.latest.tileSize, getTextureSortRankOrTopTextures?: string[] | ((key: string) => number), addTextures = [] as string[]) {
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
        for (const itemName of new Set([...Object.keys(itemsAtlases.latest.textures), ...addTextures])) {
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
            if (!info) throw new Error(`Missing texture info from the provided atlas for ${itemName} and not custom data is provided`)
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

        const newTexturesKeys = Object.keys(newTextures)
        if (getTextureSortRankOrTopTextures) {
            const getRankFn = typeof getTextureSortRankOrTopTextures === 'function' ? getTextureSortRankOrTopTextures : (key: string) => getTextureSortRankOrTopTextures.includes(key) ? 1 : -1
            newTexturesKeys.sort((a, b) => getRankFn(b) - getRankFn(a))
        }
        const { json, canvas } = makeTextureAtlas({
            input: newTexturesKeys,
            getLoadedImage: (name) => {
                const texture = newTextures[name]!
                const image = texture.img
                const imgWidth = image.width
                const imgHeight = image.height
                //@ts-ignore we no longer need the image, remove from atlas
                delete texture.img
                return {
                    image,
                    renderWidth: texture.su * imgWidth,
                    renderHeight: texture.sv * imgHeight,
                    renderSourceStartX: texture.u * imgWidth,
                    renderSourceStartY: texture.v * imgHeight,
                    renderSourceWidth: texture.su * imgWidth,
                    renderSourceHeight: texture.sv * imgHeight,
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

    async createDebugImage(writeNames = false) {
        const atlas = this.atlas.latest
        if (atlas.width !== atlas.height) {
            throw new Error('Atlas must be square')
        }
        const wantedSize = Math.min(MAX_CANVAS_SIZE, atlas.width * (writeNames ? 6 : 1))
        const scale = wantedSize / atlas.width
        const height = atlas.height * scale;
        const width = atlas.width * scale;
        const canvas: HTMLCanvasElement = globalThis.Canvas ? new globalThis.Canvas(width, height) : document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        // Disable image smoothing for pixelated rendering
        ctx.imageSmoothingEnabled = false
        // For older browsers
        //@ts-ignore
        ctx.webkitImageSmoothingEnabled = false
        //@ts-ignore
        ctx.mozImageSmoothingEnabled = false
        //@ts-ignore
        ctx.msImageSmoothingEnabled = false

        // Draw the base atlas image
        const img = await getLoadedImage(this.latestImage)
        ctx.drawImage(img, 0, 0, atlas.width, atlas.height, 0, 0, width, height)

        // Draw debug rectangles for each texture
        ctx.strokeStyle = '#ff0000'
        ctx.lineWidth = 2

        const textureNames = Object.keys(atlas.textures)
        const totalTextures = textureNames.length
        let lastProgress = 0

        textureNames.forEach((textureName, i) => {
            const texture = atlas.textures[textureName]!

            // Log progress every 10%
            const progress = Math.floor((i / totalTextures) * 100)
            if (progress >= lastProgress + 10) {
                console.log(`Processing textures: ${progress}% (${i}/${totalTextures})`)
                lastProgress = progress
            }

            const x = texture.u * atlas.width * scale
            const y = texture.v * atlas.height * scale
            const width = (texture.su || atlas.suSv) * atlas.width * scale
            const height = (texture.sv || atlas.suSv) * atlas.height * scale

            // Create striped pattern
            const pattern = ctx.createPattern((() => {
                const patternCanvas = globalThis.Canvas ? new globalThis.Canvas(10, 10) : document.createElement('canvas')
                patternCanvas.width = 10
                patternCanvas.height = 10
                const patternCtx = patternCanvas.getContext('2d')!
                patternCtx.fillStyle = '#ff0000'
                patternCtx.fillRect(0, 0, 5, 10)
                patternCtx.fillStyle = '#ffff00'
                patternCtx.fillRect(5, 0, 5, 10)
                return patternCanvas
            })(), 'repeat')!

            ctx.strokeStyle = pattern
            ctx.strokeRect(x, y, width, height)

            if (writeNames) {
                // Configure text style
                const text = textureName
                const padding = 4
                const maxWidth = width - padding * 2

                // Start with a relatively large font size and decrease until text fits
                let fontSize = 12
                do {
                    ctx.font = `${fontSize}px monospace`
                    const metrics = ctx.measureText(text)
                    if (metrics.width <= maxWidth || fontSize <= 6) {
                        break
                    }
                    fontSize -= 1
                } while (fontSize > 6)

                ctx.fillStyle = 'white'
                ctx.strokeStyle = 'black'
                ctx.lineWidth = Math.max(1, fontSize / 6) // Scale outline with font size
                ctx.textBaseline = 'top'

                // Draw text with outline for better visibility
                const textX = x + padding
                const textY = y + padding

                // Split text into lines if it's still too wide
                const words = text.split(/(?=[A-Z_/])/g)
                let line = ''
                let lines: string[] = []
                for (const word of words) {
                    const testLine = line + word
                    const metrics = ctx.measureText(testLine)
                    if (metrics.width > maxWidth && line !== '') {
                        lines.push(line)
                        line = word
                    } else {
                        line = testLine
                    }
                }
                lines.push(line)

                // Draw each line
                const lineHeight = fontSize * 1.2
                lines.forEach((line, i) => {
                    ctx.strokeText(line, textX, textY + i * lineHeight)
                    ctx.fillText(line, textX, textY + i * lineHeight)
                })
            }
        })

        console.log(`Processing textures: 100% (${totalTextures}/${totalTextures})`)
        return canvas.toDataURL()
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
