//@ts-ignore
import { MaxRectsPacker, PACKING_LOGIC, Rectangle } from 'maxrects-packer'

export const MAX_CANVAS_SIZE = 16_384

function nextPowerOfTwo(n) {
    if (n === 0) return 1
    n--
    n |= n >> 1
    n |= n >> 2
    n |= n >> 4
    n |= n >> 8
    n |= n >> 16
    return n + 1
}

export const getAtlasSize = (numberOfTiles: number, tileSize: number) => {
    const size = nextPowerOfTwo(Math.ceil(Math.sqrt(numberOfTiles)))
    return {
        width: size * tileSize,
        height: size * tileSize
    }
}

export type JsonAtlas = {
    suSv: number,
    tileSize: number,
    width: number,
    height: number,
    textures: {
        [file: string]: {
            u: number,
            v: number,
        }
    }
}

export type AtlasCreatorOptions = {
    input: string[]
    getLoadedImage: (name) => {
        contents?: string
        image?: HTMLImageElement
        tileWidthMult?: number

        useOriginalSize?: boolean
        renderWidth?: number
        renderHeight?: number
        renderSourceStartX?: number
        renderSourceStartY?: number
        renderSourceWidth?: number
        renderSourceHeight?: number
    }
    needHorizontalIndexes?: boolean
    tileSize?: number
    getCanvas?: (imgSize: number) => HTMLCanvasElement
}

export const makeTextureAtlas = (
    {
        input,
        getLoadedImage,
        tileSize = 16,
        getCanvas = (imgSize) => typeof document !== 'undefined' && document.createElement ? document.createElement('canvas') : new globalThis.Canvas(imgSize, imgSize, 'png' as any),
        needHorizontalIndexes = false,
    }: AtlasCreatorOptions
): {
    json: JsonAtlas
    canvas: HTMLCanvasElement
} => {
    // Pre-calculate all texture dimensions and prepare images
    const texturesWithDimensions = [...new Set(input)].map(keyValue => {
        const inputData = getLoadedImage(keyValue)
        let img: HTMLImageElement
        if (inputData.image) {
            img = inputData.image
        } else if (inputData.contents) {
            img = new Image()
            img.src = inputData.contents
        } else {
            throw new Error('No image or contents')
        }

        let renderWidth = tileSize * (inputData.tileWidthMult ?? 1)
        let renderHeight = tileSize

        if (inputData.useOriginalSize || inputData.renderWidth || inputData.renderHeight) {
            const texWidth = inputData.renderWidth ?? img.width
            const texHeight = inputData.renderHeight ?? img.height
            renderWidth = Math.ceil(texWidth / tileSize) * tileSize
            renderHeight = Math.ceil(texHeight / tileSize) * tileSize
        }

        return {
            keyValue,
            img,
            inputData,
            renderWidth,
            renderHeight,
            renderSourceWidth: inputData.useOriginalSize ? img.width : inputData.renderSourceWidth ?? Math.min(img.width, img.height),
            renderSourceHeight: inputData.useOriginalSize ? img.height : inputData.renderSourceHeight ?? Math.min(img.width, img.height),
            renderSourceStartX: inputData.renderSourceStartX ?? 0,
            renderSourceStartY: inputData.renderSourceStartY ?? 0,
        }
    })

    // Use MaxRectsPacker to calculate optimal positions
    const packer = new MaxRectsPacker(undefined, undefined, 0, {
        square: true,
        pot: true,
        ...needHorizontalIndexes ? {} : { smart: true },
        logic: needHorizontalIndexes ? PACKING_LOGIC.FILL_WIDTH : PACKING_LOGIC.MAX_AREA,
        // logic: PACKING_LOGIC.FILL_WIDTH,
    })

    // Add all textures as rectangles
    const rectangles = texturesWithDimensions.map(tex => {
        const rect = new Rectangle(tex.renderWidth, tex.renderHeight)
        rect.data = tex // Store texture data for later use
        return rect
    })
    packer.addArray(rectangles)

    const firstBin = packer.bins[0]
    if (!firstBin || !firstBin.rects || !firstBin.rects.length) {
        throw new Error('Failed to pack textures')
    }

    const atlas = {
        width: firstBin.width,
        height: firstBin.height,
        coords: firstBin.rects.map(rect => ({
            x: rect.x,
            y: rect.y,
            img: { data: rect.data }
        }))
    }

    // Check for duplicate keyValues in atlas
    const seenKeyValues = new Set<string>()
    for (const coord of atlas.coords) {
        const tex = coord.img.data
        if (seenKeyValues.has(tex.keyValue)) {
            throw new Error(`Duplicate texture keyValue found in atlas: ${tex.keyValue}`)
        }
        seenKeyValues.add(tex.keyValue)
    }

    if (seenKeyValues.size !== input.length) {
        throw new Error(`Lost some textures in packing: ${input.length - seenKeyValues.size}`)
    }

    // Round up atlas size to power of 2
    const imgSize = Math.max(
        nextPowerOfTwo(atlas.width),
        nextPowerOfTwo(atlas.height)
    )

    if (imgSize > MAX_CANVAS_SIZE) {
        const sizeGroups = texturesWithDimensions.reduce((acc, t) => {
            const key = `${t.renderWidth}x${t.renderHeight}`
            acc[key] = (acc[key] || 0) + 1
            return acc
        }, {} as Record<string, number>)
        const sizeGroupsStr = Object.entries(sizeGroups)
            .sort(([, a], [, b]) => b - a)
            .map(([size, count]) => `${size}(${count})`)
            .join(', ')
        throw new Error(`Required atlas size ${imgSize} exceeds maximum ${MAX_CANVAS_SIZE}. Texture sizes: ${sizeGroupsStr}`)
    }

    const canvas = getCanvas(imgSize)
    canvas.width = imgSize
    canvas.height = imgSize
    const g = canvas.getContext('2d')!
    g.imageSmoothingEnabled = false

    const texturesIndex = {}
    const suSv = tileSize / imgSize
    const tilesPerRow = Math.ceil(imgSize / tileSize)

    // Draw textures at their calculated positions
    for (const coord of atlas.coords) {
        const tex = coord.img.data
        const x = coord.x
        const y = coord.y

        const yIndex = Math.floor(y / tileSize)
        const xIndex = Math.floor(x / tileSize)
        const tileIndex = yIndex * tilesPerRow + xIndex

        try {
            g.drawImage(
                tex.img,
                tex.renderSourceStartX,
                tex.renderSourceStartY,
                tex.renderSourceWidth,
                tex.renderSourceHeight,
                x,
                y,
                tex.renderWidth,
                tex.renderHeight
            )
        } catch (err) {
            throw new Error(`Error drawing ${tex.keyValue}: ${err}`)
        }

        const cleanName = tex.keyValue.split('.').slice(0, -1).join('.') || tex.keyValue
        const su = tex.renderWidth / imgSize
        const sv = tex.renderHeight / imgSize
        texturesIndex[cleanName] = {
            u: x / imgSize,
            v: y / imgSize,
            tileIndex,
            ...su == suSv && sv == suSv ? {} : { su, sv }
        }
    }

    return {
        canvas,
        json: {
            suSv,
            tileSize,
            width: imgSize,
            height: imgSize,
            textures: texturesIndex
        }
    }
}
