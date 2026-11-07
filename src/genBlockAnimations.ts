import fs from 'fs'
import { join } from 'path/posix'
import { Image } from 'canvas'
import { makeTextureAtlas } from './atlasNode'
import { versionToNumber } from './consumer/utils'
import { AtlasTextureAnimation, TextureAnimation, TextureAnimationsJson, parseAnimationMcmeta } from './consumer/textureAnimations'

const rawData = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8')) as Record<string, Record<string, Record<string, string>>>

// versions that hold own textures (not just latest), oldest first
const versions = Object.keys(rawData).filter(v => v !== 'latest' && rawData[v]!['textures/']).sort((a, b) => versionToNumber(a) - versionToNumber(b))

/**
 * Content of a file at the given version. An entry at version X is valid for versions older than X,
 * so look at X first and then at the next newer versions that changed the file.
 */
const resolveFile = (fromVersion: string | 'latest', key: string): string | undefined => {
    const start = fromVersion === 'latest' ? versions.length : versions.indexOf(fromVersion)
    for (const version of versions.slice(start)) {
        const path = rawData[version]!['textures/']![key]
        if (path) return path
    }
    return rawData.latest!['textures/']![key]
}

const imageSizes = new Map<string, { width: number, height: number }>()
const getImageSize = (path: string) => {
    let size = imageSizes.get(path)
    if (!size) {
        const image = new Image()
        image.src = fs.readFileSync(join('data', path))
        size = { width: image.width, height: image.height }
        imageSizes.set(path, size)
    }
    return size
}

type ResolvedAnimation = { texturePath: string, animation: TextureAnimation }

/** Animation of the texture as it was at given version, if any */
const getAnimationAt = (version: string | 'latest', textureKey: string): ResolvedAnimation | undefined => {
    const texturePath = resolveFile(version, `blocks/${textureKey}.png`)
    const mcmetaPath = resolveFile(version, `blocks/${textureKey}.png.mcmeta`)
    if (!texturePath || !mcmetaPath) return
    try {
        const { width, height } = getImageSize(texturePath)
        const animation = parseAnimationMcmeta(JSON.parse(fs.readFileSync(join('data', mcmetaPath), 'utf8')), width, height)
        return animation && { texturePath, animation }
    } catch (err) {
        console.warn(`Skipping animation of ${textureKey} (${version}): ${err.message}`)
        return undefined
    }
}

const sameAnimation = (a: ResolvedAnimation | undefined, b: ResolvedAnimation | undefined) => {
    return a?.texturePath === b?.texturePath && JSON.stringify(a?.animation) === JSON.stringify(b?.animation)
}

// every texture that ever had a .mcmeta (many have it for other purposes, such as mipmap settings)
const textureKeys = new Set<string>()
for (const textures of [rawData.latest!['textures/']!, ...versions.map(v => rawData[v]!['textures/']!)]) {
    for (const key of Object.keys(textures)) {
        if (key.startsWith('blocks/') && key.endsWith('.png.mcmeta')) textureKeys.add(key.slice('blocks/'.length, -'.png.mcmeta'.length))
    }
}

const resolved = {
    latest: {} as Record<string, ResolvedAnimation>,
    versions: {} as Record<string, Record<string, ResolvedAnimation | null>>,
}
for (const textureKey of textureKeys) {
    const latest = getAnimationAt('latest', textureKey)
    if (latest) resolved.latest[textureKey] = latest
    // go from newer to older versions and only write when something changes
    let previous = latest
    for (const version of [...versions].reverse()) {
        // versions where neither the image nor the mcmeta changed are the same as the newer ones
        const changesTexture = [`blocks/${textureKey}.png`, `blocks/${textureKey}.png.mcmeta`].some(key => key in rawData[version]!['textures/']!)
        if (!changesTexture) continue
        const current = getAnimationAt(version, textureKey)
        if (sameAnimation(current, previous)) continue
        resolved.versions[version] ??= {}
        resolved.versions[version]![textureKey] = current ?? null
        previous = current
    }
}

// pack sprite sheets as is (without scaling and padding), the consumer copies frames from there
const sheets = new Set<string>()
for (const animation of [...Object.values(resolved.latest), ...Object.values(resolved.versions).flatMap(v => Object.values(v))]) {
    if (animation) sheets.add(animation.texturePath)
}
if (!sheets.size) throw new Error('No animated block textures found')
const { image, json: atlasJson } = makeTextureAtlas([...sheets], texturePath => ({
    contents: `data:image/png;base64,${fs.readFileSync(join('data', texturePath), 'base64')}`,
    useOriginalSize: true,
}), { tileSize: 1 })

const toAtlasAnimation = ({ texturePath, animation }: ResolvedAnimation): AtlasTextureAnimation => {
    const position = atlasJson.textures[texturePath.replace(/\.png$/, '')]
    if (!position) throw new Error(`Missing ${texturePath} in animations atlas`)
    return { ...animation, x: Math.round(position.u * atlasJson.width), y: Math.round(position.v * atlasJson.height) }
}

const output: TextureAnimationsJson = {
    image: { width: atlasJson.width, height: atlasJson.height },
    latest: Object.fromEntries(Object.entries(resolved.latest).map(([name, animation]) => [name, toAtlasAnimation(animation)])),
    versions: Object.fromEntries(Object.entries(resolved.versions).map(([version, textures]) => [
        version,
        Object.fromEntries(Object.entries(textures).map(([name, animation]) => [name, animation && toAtlasAnimation(animation)])),
    ])),
}

fs.writeFileSync('./dist/blocksAnimationsAtlas.png', image)
fs.writeFileSync('./dist/blocksAnimations.json', JSON.stringify(output), 'utf8')
console.log(`Animated blocks textures: ${Object.keys(output.latest).length} (latest), ${Object.values(output.versions).reduce((sum, v) => sum + Object.keys(v).length, 0)} (older versions). Atlas ${atlasJson.width}x${atlasJson.height}`)
