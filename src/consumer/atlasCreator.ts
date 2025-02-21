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
    format?: 'uv' | 'index'
    tileSize?: number
    getCanvas?: (imgSize: number) => HTMLCanvasElement
}

export const makeTextureAtlas = (
    {
        input,
        getLoadedImage,
        tileSize = 16,
        getCanvas = (imgSize) => typeof document !== 'undefined' && document.createElement ? document.createElement('canvas') : new globalThis.Canvas(imgSize, imgSize, 'png' as any),
    }: AtlasCreatorOptions
): {
    json: JsonAtlas
    canvas: HTMLCanvasElement
} => {
    // Pre-calculate all texture dimensions first
    const texturesWithDimensions = input.map(keyValue => {
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
            area: renderWidth * renderHeight
        }
    })

    // Sort textures by area (largest first) to optimize packing
    texturesWithDimensions.sort((a, b) => b.area - a.area)

    // Calculate required atlas size based on actual texture dimensions
    let requiredWidth = 0
    let requiredHeight = 0
    let currentX = 0
    let currentY = 0
    let rowHeight = 0

    for (const tex of texturesWithDimensions) {
        if (currentX + tex.renderWidth > requiredWidth) {
            currentX = 0
            currentY += rowHeight
            rowHeight = tex.renderHeight
        } else {
            rowHeight = Math.max(rowHeight, tex.renderHeight)
        }
        currentX += tex.renderWidth
        requiredWidth = Math.max(requiredWidth, currentX)
        requiredHeight = Math.max(requiredHeight, currentY + rowHeight)
    }

    // Round up to power of 2 and ensure minimum size
    const imgSize = Math.max(
        nextPowerOfTwo(requiredWidth),
        nextPowerOfTwo(requiredHeight)
    )

    if (imgSize > MAX_CANVAS_SIZE) {
        const sizeGroups = texturesWithDimensions.reduce((acc, t) => {
            const key = `${t.renderWidth}x${t.renderHeight}`
            acc[key] = (acc[key] || 0) + 1
            return acc
        }, {})
        const sizeGroupsStr = Object.entries(sizeGroups)
            .sort(([,a], [,b]) => b - a)
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

    let nextX = 0
    let nextY = 0
    let rowMaxY = 0

    const goToNextRow = () => {
        nextX = 0
        nextY += Math.ceil(rowMaxY / tileSize) * tileSize
        rowMaxY = 0
    }

    // Now place textures in the pre-calculated order
    for (const { keyValue, img, inputData, renderWidth, renderHeight } of texturesWithDimensions) {
        if (nextX + renderWidth > imgSize) {
            goToNextRow()
        }

        // Verify we still have room (sanity check)
        if (nextY + renderHeight > imgSize) {
            throw new Error(`Atlas overflow placing ${keyValue} at (${nextX},${nextY}). This shouldn't happen!`)
        }

        const x = nextX
        const y = nextY

        const yIndex = y / tileSize
        const xIndex = x / tileSize
        const tileIndex = yIndex * tilesPerRow + xIndex

        nextX += renderWidth
        rowMaxY = Math.max(rowMaxY, renderHeight)

        const renderSourceDefaultSize = Math.min(img.width, img.height)
        const renderSourceWidth = inputData.useOriginalSize ? img.width : inputData.renderSourceWidth ?? renderSourceDefaultSize
        const renderSourceHeight = inputData.useOriginalSize ? img.height : inputData.renderSourceHeight ?? renderSourceDefaultSize

        const sourceStartX = inputData.renderSourceStartX ?? 0
        const sourceStartY = inputData.renderSourceStartY ?? 0
        if (sourceStartX + renderSourceWidth > img.width || sourceStartY + renderSourceHeight > img.height) {
            throw new Error(`Source coordinates (${sourceStartX},${sourceStartY},${renderSourceWidth},${renderSourceHeight}) exceed image bounds (${img.width},${img.height}) for ${keyValue}`)
        }

        try {
            g.drawImage(img, sourceStartX, sourceStartY, renderSourceWidth, renderSourceHeight, x, y, renderWidth, renderHeight)
        } catch (err) {
            throw new Error(`Error drawing ${keyValue}: ${err}`)
        }

        const cleanName = keyValue.split('.').slice(0, -1).join('.') || keyValue
        const su = renderWidth / imgSize
        const sv = renderHeight / imgSize
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
