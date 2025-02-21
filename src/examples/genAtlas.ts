import { Image, Canvas } from 'canvas'
import { AtlasParser } from '../consumer'
import fs from 'fs'

//@ts-ignore
globalThis.Image = Image
globalThis.Canvas = Canvas

const blocksAtlase = JSON.parse(fs.readFileSync('./dist/blocksAtlases.json', 'utf8'))
const image = fs.readFileSync('./dist/blocksAtlasLatest.png', 'base64')

const atlasParser = new AtlasParser(blocksAtlase, `data:image/png;base64,${image}`)
atlasParser.makeNewAtlas('latest', (name) => {
    if (['smoker_front', 'custom'].includes(name)) {
        // dummy 320x320 image
        const WIDTH = 320;
        const HEIGHT = WIDTH;
        const canvas = new Canvas(WIDTH, HEIGHT)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(0, 0, WIDTH, HEIGHT)
        return canvas.toDataURL()
    }
    return undefined
}, 0, undefined, ['custom']).then(({image, newAtlasParser}) => {
    newAtlasParser.createDebugImage(true).then(image => {
        fs.writeFileSync('./temp/debugBlocksAtlasLatest.png', image.replace('data:image/png;base64,', ''), 'base64')
    })
})
