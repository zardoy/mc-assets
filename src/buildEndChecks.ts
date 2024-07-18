import fs from 'fs'

if (!fs.existsSync('./data/data-paths.json')) {
    throw new Error('data-paths.json not found, run build script first')
}

if (!fs.existsSync('./dist/blockStatesModels.json')) {
    throw new Error('blockStatesModels.json not found, run build script first')
}

if (!fs.existsSync('./dist/index.js')) {
    throw new Error('index.js not found, run build script first')
}
