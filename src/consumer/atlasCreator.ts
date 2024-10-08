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
    const tilesCount = input.length
    const imgSize = getAtlasSize(tilesCount, tileSize).width
    const MAX_CANVAS_SIZE = 16_384
    if (imgSize > MAX_CANVAS_SIZE) {
        throw new Error(`Image resolution ${imgSize} is too big, max is ${MAX_CANVAS_SIZE}x${MAX_CANVAS_SIZE}`)
    }

    const canvas = getCanvas(imgSize)
    canvas.width = imgSize
    canvas.height = imgSize
    const g = canvas.getContext('2d')!
    g.imageSmoothingEnabled = false

    const texturesIndex = {}

    let nextX = 0
    let nextY = 0
    let rowMaxY = 0

    const goToNextRow = () => {
        nextX = 0
        nextY += Math.ceil(rowMaxY / tileSize) * tileSize
        rowMaxY = 0
    }

    const suSv = tileSize / imgSize
    const tilesPerRow = Math.ceil(imgSize / tileSize)
    for (const i in input) {
        const keyValue = input[i]!
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
        let su = suSv
        let sv = suSv
        let renderWidth = tileSize * (inputData.tileWidthMult ?? 1)
        let renderHeight = tileSize
        if (inputData.useOriginalSize || inputData.renderWidth || inputData.renderHeight) {
            const texWidth = inputData.renderWidth ?? img.width
            const texHeight = inputData.renderHeight ?? img.height
            // todo check have enough space
            renderWidth = Math.ceil(texWidth / tileSize) * tileSize
            renderHeight = Math.ceil(texHeight / tileSize) * tileSize
            su = texWidth / imgSize
            sv = texHeight / imgSize
            // renderWidth and renderHeight take full tile size so everything is aligned to the grid
            if (renderHeight > imgSize || renderWidth > imgSize) {
                throw new Error('Texture ' + keyValue + ' is too big')
            }
        }

        if (nextX + renderWidth > imgSize) {
            goToNextRow()
        }

        const x = nextX
        const y = nextY

        const yIndex = y / tileSize
        const xIndex = x / tileSize
        const tileIndex = yIndex * tilesPerRow + xIndex

        nextX += renderWidth
        rowMaxY = Math.max(rowMaxY, renderHeight)
        if (nextX >= imgSize) {
            goToNextRow()
        }

        const renderSourceDefaultSize = Math.min(img.width, img.height)
        const renderSourceWidth = inputData.useOriginalSize ? img.width : inputData.renderSourceWidth ?? renderSourceDefaultSize
        const renderSourceHeight = inputData.useOriginalSize ? img.height : inputData.renderSourceHeight ?? renderSourceDefaultSize
        try {
            g.drawImage(img, inputData.renderSourceStartX ?? 0, inputData.renderSourceStartY ?? 0, renderSourceWidth, renderSourceHeight, x, y, renderWidth, renderHeight)
        } catch (err) {
            throw new Error(`Error drawing ${keyValue}: ${err}`)
        }

        // remove the extension eg .png
        const cleanName = keyValue.split('.').slice(0, -1).join('.') || keyValue
        texturesIndex[cleanName] = {
            u: x / imgSize,
            v: y / imgSize,
            tileIndex,
            ...su == suSv && sv == suSv ? {} : {
                su,
                sv,
                // width: renderWidth,
                // height: renderHeight
            }
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
