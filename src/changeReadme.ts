import fs from 'fs'

if (!process.env.CI) process.exit(0)

let readme = fs.readFileSync('./README.MD', 'utf8')
const bundleSize = fs.readFileSync('./temp/bundleWebAppSize.txt', 'utf8')
const dataPaths = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'));
const missingBlockEntities = JSON.parse(fs.readFileSync('./src/missingBlockEntities.json', 'utf8'))
const renderedBlockEntities = [] as string[]
for (const [name, value] of Object.entries(dataPaths.latest['blockstates/'])) {
    if (value.includes('custom/blockentities/')) {
        renderedBlockEntities.push(name.split('/').pop()!.replace('.json', ''))
    }
}
const notRenderedBlockEntities = Object.keys(missingBlockEntities).filter(name => !renderedBlockEntities.includes(name))
const includedVersions = Object.keys(dataPaths).filter(v => v !== 'latest').join(', ')
readme = readme.replace(/<!-- GENERATED -->/, `
All blockstates + models + all atlas textures for all versions bundled with rsbuild (uncompressed): ${bundleSize}.

This packages includes versions for: ${includedVersions}.

<details>
<summary>Included Block Entities (Additional Block Models) (${renderedBlockEntities.length}):</summary>

${renderedBlockEntities.map(name => `- ✅ ${name}`).join('\n')}
${notRenderedBlockEntities.map(name => `- ❌ ${name}`).join('\n')}

</details>

`)
fs.writeFileSync('./README.MD', readme)
