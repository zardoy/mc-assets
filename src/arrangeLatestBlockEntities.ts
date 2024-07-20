import fs from 'fs'
import path from 'path'

const dataPaths = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))

const newBlockentitiesPath = path.join('./custom/blockentities/latest')

const basePath = path.join('./custom/blockentities')
const process = () => {
    const processDir = (dir: string) => {
        const fullDir = path.join(newBlockentitiesPath, 'blockStates', dir)
        const newFiles = fs.readdirSync(path.join(fullDir), { withFileTypes: true })
        for (const file of newFiles) {
            const fileName = file.name
            if (file.isDirectory()) {
                processDir(path.join(dir, fileName))
                continue
            }
            const filePath = path.join(fullDir, fileName)
            if (fileName.endsWith('.json')) {
                const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))
                const processObj = (obj) => {
                    if (obj.model) {
                        const model = JSON.parse(fs.readFileSync(`${path.join(newBlockentitiesPath, 'blockModels', obj.model)}.json`, 'utf8'))
                        const textures = model.textures
                        if (!textures) return
                        if (Object.keys(textures).length === 0) throw new Error(`Model ${obj.model} has no textures`)
                        const firstTexture = Object.values(textures)[0] as string
                        const texturePath = dataPaths.latest['textures/']![`${firstTexture}.png`]
                        if (!texturePath) throw new Error(`Model ${obj.model} has texture ${firstTexture} but it doesn't exist`)
                        const versionFolder = texturePath.split('/')[0]!
                        console.log(versionFolder)
                        // TODO put
                    }
                    for (const [prop, value] of Object.entries(obj)) {
                        if (typeof value === 'object' && value !== null) {
                            processObj(value)
                        }
                    }
                }
                processObj(json)
            }
        }

    }
    processDir('')

}

process()
