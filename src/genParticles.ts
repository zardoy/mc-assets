import fs from 'fs'
import { makeTextureAtlas } from './atlasNode'
import { join } from 'path'

const rawData = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))

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

const latestAtlas = makeAtlas('particlesAtlasLatest', {
    ...Object.fromEntries(Object.entries(rawData.latest['textures/']).filter(([key]) => {
        return (key.startsWith('particle/')) && key.endsWith('.png')
    }).map(([key, path]) => [key.replace('particle/', ''), path])),
})

const legacyTextures = {} as Record<string, string>
for (const version of Object.keys(rawData)) {
    if (version === 'latest') continue
    const textures = rawData[version]['textures/']
    if (!textures) continue
    for (const [key, path] of Object.entries(textures)) {
        if (!path.endsWith('.png')) continue
        if (key.startsWith('particle/')) {
            legacyTextures[`${version}/${key.replace('particle/', '')}`] = path
        }
    }
}

const legacyAtlas = makeAtlas('particlesAtlasLegacy', legacyTextures)

fs.writeFileSync('./dist/particlesAtlases.json', JSON.stringify({
    latest: latestAtlas,
    legacy: legacyAtlas
}, null, 4), 'utf8')
