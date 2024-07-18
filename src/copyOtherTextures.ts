import fs from 'fs'
import { join, dirname } from 'path'

const handledTextureKeys = [
    'blocks/',
    'block/',
    'items/',
    'item',
    'particle/'
]

const rawData = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))

const baseTargetPath = './dist/other-textures'
fs.mkdirSync(baseTargetPath, { recursive: true })

const copyByVersion = (version: string) => {
    const texturesRaw = rawData[version]['textures/'];
    if (!texturesRaw) return
    const textures = Object.entries(texturesRaw).filter(([path]) => {
        return handledTextureKeys.every(key => !path.startsWith(key))
    })
    for (const [targetPath, srcPath] of textures) {
        const targetPathWithVersion = join(baseTargetPath, version, targetPath)
        fs.mkdirSync(dirname(targetPathWithVersion), { recursive: true })
        fs.copyFileSync(join('./data', srcPath), targetPathWithVersion)
    }
}

for (const version of Object.keys(rawData)) {
    copyByVersion(version)
}
