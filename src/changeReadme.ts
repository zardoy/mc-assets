import fs from 'fs'

if (!process.env.CI) process.exit(0)

let readme = fs.readFileSync('./README.MD', 'utf8')
const bundleSize = fs.readFileSync('./temp/bundleWebAppSize.txt', 'utf8')
const dataPaths = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'));
const includedVersions = Object.keys(dataPaths).filter(v => v !== 'latest').join(', ')
readme = readme.replace(/<!-- GENERATED -->/, `
All blockstates + models + all atlas textures for all versions bundled (uncompressed): ${bundleSize}.

This packages includes versions for: ${includedVersions}.
`)
fs.writeFileSync('./README.MD', readme)
