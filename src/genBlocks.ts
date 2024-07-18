import fs from 'fs'
import { makeTextureAtlas } from './atlas'
import { join } from 'path'

const rawData = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))
const blockstatesModels = JSON.parse(fs.readFileSync('./temp/blockStatesModels.json', 'utf8'))


blockstatesModels.blockstates.latest['unknown'] = {
    variants: {
        "": {
            model: "block/unknown"
        }
    }
}
const texturesAddLatest = {
    'blocks/unknown': '../custom/missing_texture.png'
}
blockstatesModels.models.latest['block/unknown'] = {
    "parent": "block/cube_all",
    "textures": {
        "all": "blocks/unknown"
    }
}

const makeAtlas = (name, textures) => {
    const { image, json } = makeTextureAtlas(Object.keys(textures), (name) => {
        const texPath = textures[name]!;
        const contents = `data:image/png;base64,${fs.readFileSync(join('data', `${texPath}`), 'base64')}`
        return {
            contents,
        }
    })
    fs.writeFileSync(`./dist/${name}.png`, image)
    return json
}

const latestAtlas = makeAtlas('blocksAtlasLatest', {
    ...Object.fromEntries(Object.entries(rawData.latest['textures/']).filter(([key]) => {
        return (key.startsWith('blocks/')) && key.endsWith('.png')
    }).map(([key, path]) => [key.replace('blocks/', ''), path])),
})

const legacyTextures = {} as Record<string, string>
for (const version of Object.keys(rawData)) {
    if (version === 'latest') continue
    const textures = rawData[version]['textures/']
    if (!textures) continue
    for (const [key, path] of Object.entries(textures)) {
        if (!path.endsWith('.png')) continue
        if (key.startsWith('blocks/')) {
            legacyTextures[`${version}/${key.replace('blocks/', '')}`] = path
        }
    }
}

const legacyAtlas = makeAtlas('blocksAtlasLegacy', legacyTextures)

fs.writeFileSync('./dist/blocksAtlases.json', JSON.stringify({
    latest: latestAtlas,
    legacy: legacyAtlas
}, null, 4), 'utf8')
