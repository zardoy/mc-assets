import fs from 'fs'
import { Canvas, Image } from 'canvas'
import { AtlasCreatorOptions, JsonAtlas, makeTextureAtlas as makeAtlas } from './consumer/atlasCreator'

//@ts-ignore
globalThis.Image = Image

export const makeTextureAtlas = (
  input: string[],
  getInputData: AtlasCreatorOptions['getLoadedImage'],
): {
  image: Buffer,
  json: JsonAtlas
} => {
  let canvas!: Canvas
  const {json} = makeAtlas({
    getCanvas(imgSize) {
        canvas = new Canvas(imgSize, imgSize, 'png' as any)
        return canvas as any
    },
    input,
    getLoadedImage: getInputData,
  })
  return {
    image: canvas.toBuffer(),
    json
  }
}

export const writeCanvasStream = (canvas, path, onEnd) => {
  const out = fs.createWriteStream(path)
  const stream = (canvas as any).pngStream()
  stream.on('data', (chunk) => out.write(chunk))
  if (onEnd) stream.on('end', onEnd)
  return stream
}
