import fs from 'fs'
import path from 'path'
import { createCanvas, Image } from 'canvas'
import { makeTextureAtlas } from './atlasNode'

const invsprite = JSON.parse(fs.readFileSync('./custom/invsprite.json', 'utf8'))
const included = JSON.parse(fs.readFileSync('./inv.json', 'utf8'))

// const invspriteImg = fs.readFileSync('./custom/invsprite.png')
const img = new Image()
img.src = './custom/invsprite.png'
const invspriteCanvas = createCanvas(img.width, img.height)
const invspriteCtx = invspriteCanvas.getContext('2d')
invspriteCtx?.drawImage(img, 0, 0)


const all = Object.keys(invsprite)
const excluded = all.filter(x => !included.includes(x))

const {image} = makeTextureAtlas(included, (name) => {
    const { x, y } = invsprite[name]

    const sliceCanvas = createCanvas(16, 16);
    const sliceCtx = sliceCanvas.getContext('2d');
    sliceCtx.drawImage(invspriteCanvas, x, y, 32, 32, 0, 0, 16, 16);

    return {
        contents: sliceCanvas.toDataURL(),
    }
})

fs.writeFileSync('./custom/invsprite-new.png', image)

// fs.writeFileSync('./excluded.json', JSON.stringify(excluded, null, 4))
