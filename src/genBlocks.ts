import fs from 'fs'
import { makeTextureAtlas } from './atlasNode'
import { join } from 'path'

const rawData = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))
const blockstatesModels = JSON.parse(
    fs.existsSync('./dist/blockStatesModels.json')
        ? fs.readFileSync('./dist/blockStatesModels.json', 'utf8')
        : fs.readFileSync('./temp/blockStatesModels.json', 'utf8')
)

blockstatesModels.blockstates.latest['unknown'] = {
    variants: {
        "": {
            model: "block/unknown"
        }
    }
}
blockstatesModels.blockstates.latest['errored'] = {
    variants: {
        "": {
            model: "block/errored"
        }
    }
}
const texturesAddFirst = {
    'unknown': '../custom/missing_texture.png',
    'errored': '../custom/errored_texture.png'
}
const texturesAddLast = {}
blockstatesModels.models.latest['block/unknown'] = {
    "parent": "block/cube_all",
    "textures": {
        "all": "block/unknown"
    }
}
blockstatesModels.models.latest['block/errored'] = {
    "parent": "block/cube_all",
    "textures": {
        "all": "block/errored"
    }
}

for (const [name, { textures = {} }] of Object.entries(blockstatesModels.models.latest)) {
    for (const texture of Object.values(textures as Record<string, string>)) {
        const textureNameClean = texture.replace('block/', '')
        const textureNamePath = textureNameClean + '.png'
        if (!textureNamePath.startsWith('entity/')) continue
        const texturePath = rawData.latest['textures/'][textureNamePath]
        if (!texturePath) throw new Error(`Missing texture ${textureNamePath}: ${texture}`)
        texturesAddLast[textureNameClean] = texturePath
    }
}

const makeAtlas = (name, textures) => {
    const { image, json } = makeTextureAtlas(Object.keys(textures), (name) => {
        const texPath = textures[name]!
        const contents = `data:image/png;base64,${fs.readFileSync(join('data', `${texPath}`), 'base64')}`
        return {
            contents,
            // todo
            useOriginalSize: name.includes('entity/'),
        }
    })
    fs.writeFileSync(`./dist/${name}.png`, image)
    return json
}

const latestAtlas = makeAtlas('blocksAtlasLatest', {
    ...texturesAddFirst,
    ...Object.fromEntries(Object.entries(rawData.latest['textures/']).filter(([key]) => {
        return (key.startsWith('blocks/')) && key.endsWith('.png')
    }).map(([key, path]) => [key.replace('blocks/', ''), path])),
    ...texturesAddLast
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

fs.writeFileSync('./dist/blockStatesModels.json', JSON.stringify(blockstatesModels, null, 4), 'utf8')
fs.writeFileSync('./dist/blocksAtlases.json', JSON.stringify({
    latest: latestAtlas,
    legacy: legacyAtlas
}, null, 4), 'utf8')
