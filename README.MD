# MC Assets

![banner](./docs-assets/mc-assets.png)

```bash
npm i mc-assets
```

**NEXT-GEN Minecraft Assets Library**

## Features

- **Automatic Updates** - This library is automatically updated and published to npm.
- **Fully Typed** - Today is nothing can be done without TypeScript. We ship best type definitions possible.
- **Early Access** - It always includes the latest pre and rc (release candidate) version.
- **Version Accurate** - Includes all released versions starting from 1.7.10.
- **Memory Efficient** - Small installation size, for the fastest download & loading time.
- **Simple & Complete API** - Works in browsers out of the box and provides parsers for all the data this library provides.
- **Easy to Use Items Textures** - Includes hand-crafted isometric textures for some blocks.
- **Block Entities Models** - Includes community-crafted models for block entities.

This module was originally designed as standalone package for [https://mcraft.fun](mcraft.fun) (repo) project so it is easier to maintain, but now it became a library that I think can cover any use case where you need to work with minecraft assets. This library means block states, models data and texture contents, it doesn't cover minecraft-data use cases. With the best block model parser you can build your own renderers, editors, etc.

> Bundled modules & block states are version-accurate starting from 1.13.0 (post-flattening) version.
> Tested on Node.js 18 and above.

<!-- GENERATED -->

[Atlas explorer (web demo)](https://zardoy.github.io/mc-assets/).

[External Models Playground](https://mcraft.fun/playground.html)

## Usage

Following atlases are generated:

- Items
- Blocks (block entities included)
- Particles

```ts
import { AssetsParser, getLoadedModelsStore, getLoadedBlockstatesStore } from 'mc-assets'
import blockstatesModels from 'mc-assets/dist/blockStatesModels.json'

const blockstatesStore = getLoadedBlockstatesStore(blockstatesModels)
const modelsStore = getLoadedModelsStore(blockstatesModels)
// get block states for specific block
const stoneModels = blockstatesStore.get('latest', 'stone').variants['']
// [
//   { model: 'block/stone' },
//   { model: 'block/stone_mirrored' },
//   { model: 'block/stone', y: 180 },
//   { model: 'block/stone_mirrored', y: 180 }
// ]
const model = modelsStore.get('latest', 'block/stone_mirrored')
// { parent: 'block/cube_mirrored_all', textures: { all: 'block/stone' } }

// note: you can always specify a specific version instead of 'latest'
const assetsParser = new AssetsParser('latest', blockstatesStore, modelsStore)

const resolvedModel = assetsParser.getAllResolvedModels({
    name: 'stone', // block name not model name
    properties: {},
}, false) // false (default) means return empty if variant matching properties is not found
// [
//   [
//     {
//       x: undefined,
//       y: undefined,
//       z: undefined,
//       uvlock: undefined,
//       weight: undefined,
//       textures: {
//         all: 'block/stone',
//         particle: 'block/stone',
//         down: 'block/stone',
//         up: 'block/stone',
//         north: 'block/stone',
//         east: 'block/stone',
//         south: 'block/stone',
//         west: 'block/stone'
//       },
//       elements: [
//         {
//           from: [ 0, 0, 0 ],
//           to: [ 16, 16, 16 ],
//           faces: {
//             down: { texture: 'block/stone', cullface: 'down' },
//             up: { texture: 'block/stone', cullface: 'up' },
//             north: { texture: 'block/stone', cullface: 'north' },
//             south: { texture: 'block/stone', cullface: 'south' },
//             west: { texture: 'block/stone', cullface: 'west' },
//             east: { texture: 'block/stone', cullface: 'east' }
//           }
//         }
//       ]
//     }
//   ],
//   [ ... ] // second variant and so on
// ]
```

`getAllResolvedModels` returns an array of arrays, where first depth level is model parts, second depth level is variants (for example Minecraft chooses them randomly). You can use `getResolvedModelFirst` to get first variant only. Or `getResolvedModelRandom` to get a random variant.

### Rendering Atlas Textures

```ts
import { AssetsParser, AtlasParser } from 'mc-assets'
import blocksAtlases from 'mc-assets/dist/blocksAtlases.json'
import blocksAtlasLatest from 'mc-assets/dist/blocksAtlasLatest.png'
import blocksAtlasLegacy from 'mc-assets/dist/blocksAtlasLegacy.png'

const atlasParser = new AtlasParser(blocksAtlases, blocksAtlasLatest, blocksAtlasLegacy) // blocksAtlasLegacy is optional

const diamondOreTexture = atlasParser.getTextureInfo('diamond_ore', '1.13') // get old diamond ore texture
const img = await diamondOreTexture.getLoadedImage()

const canvas = document.createElement('canvas')
const sourceWidthSize = img.width * diamondOreTexture.su // 16
const sourceHeightSize = img.width * diamondOreTexture.sv // 16
canvas.width = 128
canvas.height = 128
document.body.appendChild(canvas)

const ctx = canvas.getContext('2d')!
ctx.imageSmoothingEnabled = false

ctx.drawImage(img, diamondOreTexture.u * img.width, diamondOreTexture.v * img.height, sourceWidthSize, sourceHeightSize, 0, 0, canvas.width, canvas.height)



// create new custom texture atlas (e.g. resource pack overrides)
const { atlas, canvas, newAtlasParser } = await atlasParser.makeNewAtlas('1.13') // with second argument (callback) you can override textures, with third use different tile size (use it if you have high-res textures)
const image = canvas.toDataURL() // get image data url if you need it
const diamondOreTexture = newAtlasParser.getTextureInfo('diamond_ore') // get old diamond ore texture (essentially the same as above)
```

### Getting Other Textures

Textures without atlases are stored in `dist/other-textures` folder. You can use them like this:

```ts
import unmute_button from 'mc-assets/dist/other-textures/latest/gui/sprites/social_interactions/unmute_button.png'
import unmute_button_highlighted from 'mc-assets/dist/other-textures/latest/gui/sprites/social_interactions/unmute_button_highlighted.png'

const Button = styled.button`
    background-image: url(${unmute_button});
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border: none;
    outline: none;
    cursor: pointer;
    width: 32px;
    height: 32px;
`

const ButtonHighlighted = styled(Button)`
    background-image: url(${unmute_button_highlighted});
`
```

Please, don't use json / image files directly as their format is not stable and can change in the future, use the parsers instead.
