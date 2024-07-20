import fs from 'fs'
import { AtlasParser } from '../consumer/atlasParser'
import { Image, Canvas } from 'canvas'

const main = async () => {
    globalThis.Image = Image as any
    globalThis.Canvas = Canvas

    const blocksAtlases = JSON.parse(fs.readFileSync('./dist/blocksAtlases.json', 'utf8'))
    const latestBlocksAtlasImage = `data:image/png;base64,${fs.readFileSync('./dist/blocksAtlasLatest.png', 'base64')}`

    const blocksAtlasParser = new AtlasParser(blocksAtlases, latestBlocksAtlasImage)
    const {atlas, image} = await blocksAtlasParser.makeNewAtlas('latest', (name) => {
        // const texturePath = `<resource pack>/assets/minecraft/textures/${name.startsWith('entity/') ? '' : 'blocks/'}${name}`
        // if (!fs.existsSync(texturePath)) return
        // const image = new Image()
        // image.src = texturePath
        // return image as unknown as HTMLImageElement
    }, 16) // tile resolution

    fs.writeFileSync('./dist/customAtlas.json', JSON.stringify(atlas, null, 4))
    const dataUrl = image
    fs.writeFileSync('./dist/customAtlas.png', dataUrl.split(',')[1]!, 'base64')
}

main().catch((e) => {
    console.error(e)
})
