import { useEffect, useMemo, useRef, useState } from 'react'
import blockStatesModels from '../../../dist/blockStatesModels.json'
import itemsAtlases from '../../../dist/itemsAtlases.json'
import blocksAtlases from '../../../dist/blocksAtlases.json'
import itemsAtlasLatest from '../../../dist/itemsAtlasLatest.png'
import itemsAtlasLegacy from '../../../dist/itemsAtlasLegacy.png'
import blocksAtlasLatest from '../../../dist/blocksAtlasLatest.png'
import blocksAtlasLegacy from '../../../dist/blocksAtlasLegacy.png'
import particlesAtlases from '../../../dist/particlesAtlases.json'
import particlesAtlasLatest from '../../../dist/particlesAtlasLatest.png'
import particlesAtlasLegacy from '../../../dist/particlesAtlasLegacy.png'
import parserAtlasLegacy from '../../../dist/itemsAtlasLegacy.png'
import { AtlasParser } from '../../../src/consumer/atlasParser'

export default function AtlasExplorer() {
    const canvasRef = useRef<HTMLCanvasElement>(null!)
    const [selectedAtlas, setSelectedAtlas] = useState<'items' | 'items-legacy' | 'blocks' | 'blocks-legacy' | 'particles' | 'particles-legacy' | 'items-all-render' | 'blocks-all-render'>('items')

    const [legacyVariantVersion, setLegacyVariantVersion] = useState<string | undefined>()
    const [customImage, setCustomImage] = useState<string | undefined>()
    const [customAtlas, setCustomAtlas] = useState<any>()
    useEffect(() => {
        setCustomAtlas(undefined)
        setCustomImage(undefined)
        setLegacyVariantVersion(undefined)
    }, [selectedAtlas])

    const currentAtlas = useMemo(() => {
        if (customAtlas) return customAtlas
        if (selectedAtlas === 'items') {
            return itemsAtlases.latest
        }
        if (selectedAtlas === 'items-legacy') {
            return itemsAtlases.legacy
        }
        if (selectedAtlas === 'blocks') {
            return blocksAtlases.latest
        }
        if (selectedAtlas === 'blocks-legacy') {
            return blocksAtlases.legacy
        }
        if (selectedAtlas === 'particles') {
            return particlesAtlases.latest
        }
        if (selectedAtlas === 'particles-legacy') {
            return particlesAtlases.legacy
        }
        if (selectedAtlas === 'items-all-render') {
            const width = itemsAtlases.latest.width
            const rowTiles = width / itemsAtlases.latest.tileSize
            return {
                ...itemsAtlases.latest,
                //@ts-ignore
                textures: Object.fromEntries(blockStatesModels.latestRootItems.map((name, i) => {
                    const x = i % rowTiles
                    const y = Math.floor(i / rowTiles)
                    return [name, {
                        u: x * itemsAtlases.latest.suSv,
                        v: y * itemsAtlases.latest.suSv,
                        //@ts-ignore
                        originalUv: itemsAtlases.latest.textures[name] ?? itemsAtlases.latest.textures.missing_texture
                    }]
                }))
            }
        }
        return null
    }, [selectedAtlas, customAtlas])
    globalThis.currentAtlas = currentAtlas
    const currentAtlasParser = useMemo(() => {
        if (selectedAtlas === 'items') {
            return new AtlasParser(itemsAtlases, itemsAtlasLatest, itemsAtlasLegacy)
        }
        if (selectedAtlas === 'blocks') {
            return new AtlasParser(blocksAtlases, blocksAtlasLatest, blocksAtlasLegacy)
        }
        if (selectedAtlas === 'particles') {
            return new AtlasParser(particlesAtlases, particlesAtlasLatest, particlesAtlasLegacy)
        }
        return null
    }, [selectedAtlas])

    const [cursorName, setCursorName] = useState<string>('')
    const [highlightTexture, setHighlightTexture] = useState<{
        name: string,
        u: number,
        v: number,
        su: number
        sv: number
    } | null>(null)
    const scale = 1

    useEffect(() => {
        const ctx = canvasRef.current!.getContext('2d')!
        ctx.imageSmoothingEnabled = false
        ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
        let selectedImageSrc = ''
        if (customImage) {
            selectedImageSrc = customImage
        } else {
            if (selectedAtlas === 'items') {
                selectedImageSrc = itemsAtlasLatest
            }
            if (selectedAtlas === 'items-legacy') {
                selectedImageSrc = itemsAtlasLegacy
            }
            if (selectedAtlas === 'blocks') {
                selectedImageSrc = blocksAtlasLatest
            }
            if (selectedAtlas === 'blocks-legacy') {
                selectedImageSrc = blocksAtlasLegacy
            }
            if (selectedAtlas === 'particles') {
                selectedImageSrc = particlesAtlasLatest
            }
            if (selectedAtlas === 'particles-legacy') {
                selectedImageSrc = particlesAtlasLegacy
            }
            if (selectedAtlas === 'items-all-render') {
                ctx.canvas.width = currentAtlas!.width * scale
                ctx.canvas.height = currentAtlas!.height * scale
                for (const [key, { u, v, originalUv }] of Object.entries(currentAtlas!.textures)) {
                    const { u: originalU, v: originalV } = originalUv
                    const sourceImage = new Image()
                    sourceImage.src = itemsAtlases.latest.textures[key]
                    sourceImage.onload = () => {
                        ctx.drawImage(sourceImage, originalU * scale, originalV * scale, itemsAtlases.latest.suSv * scale, itemsAtlases.latest.suSv * scale, u * scale, v * scale, itemsAtlases.latest.suSv * scale, itemsAtlases.latest.suSv * scale)
                    }
                }
                return
            }
        }
        if (!selectedImageSrc) return
        const img = new Image()
        img.src = selectedImageSrc
        img.onload = () => {
            ctx.canvas.width = img.width * scale
            ctx.canvas.height = img.height * scale
            ctx.canvas.style.width = `${img.width * scale}px`
            ctx.canvas.style.height = `${img.height * scale}px`
            ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height)
            if (highlightTexture) {
                const { u, v, su = currentAtlas.suSv, sv = currentAtlas.suSv } = highlightTexture
                ctx.strokeStyle = 'red'
                ctx.fillStyle = 'red'
                ctx.strokeRect(u * img.width, v * img.height, su * img.width, sv * img.height)
            }
        }
    }, [selectedAtlas, customImage, highlightTexture])

    const setData = (e, isHover) => {
        //@ts-ignore
        const rect = canvasRef.current!.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const currentU = x / canvasRef.current!.width
        const currentV = y / canvasRef.current!.height
        if (!currentAtlas) return
        const atlasTextures = currentAtlas.textures
        for (const [name, texture] of Object.entries(atlasTextures)) {
            const { u, v } = texture
            if (currentU >= u && currentU <= u + currentAtlas.suSv && currentV >= v && currentV <= v + currentAtlas.suSv) {
                setCursorName(name)
                return
            }
        }
        setCursorName('')
    }

    if (currentAtlasParser) {
        currentAtlasParser.atlasStore.inclusive = true
    }
    const legacyVersions = Object.keys(currentAtlasParser?.atlasStore.data ?? {}).filter(x => x !== 'latest')

    const currentAtlasTexturesDatalist = <datalist id="currentAtlasTexturesDatalist">
        {Object.keys(currentAtlas?.textures ?? {}).map(name => <option key={name} value={name} />)}
    </datalist>

    const highlightStr = highlightTexture ? `${highlightTexture.name} (${highlightTexture.u * currentAtlas.width / currentAtlas.tileSize}, ${highlightTexture.v * currentAtlas.height / currentAtlas.tileSize})` : ''

    return <div className='flex flex-col h-screen gap-2'>
        <select className='w-min border border-gray-700 rounded-lg' value={selectedAtlas} onChange={(e) => {
            setSelectedAtlas(e.target.value as any)
        }}>
            <option value="items">Items</option>
            <option value="items-legacy">Items Legacy</option>
            <option value="blocks">Blocks</option>
            <option value="blocks-legacy">Blocks Legacy</option>
            <option value="particles">Particles</option>
            <option value="particles-legacy">Particles Legacy</option>
            <option value="items-all-render">Items All Render</option>
            <option value="blocks-all-render">Blocks All Render</option>
        </select>
        {currentAtlasParser && <div className='flex gap-2 border border-gray-700 rounded-lg'>
            Apply Legacy Version Mapping:
            <select className='w-min border border-gray-700 rounded-lg' value={String(legacyVariantVersion)} onChange={(e) => {
                setLegacyVariantVersion(e.target.value)
                console.time('makeNewAtlas')
                currentAtlasParser.makeNewAtlas(e.target.value, undefined).then(({ atlas, canvas }) => {
                    console.timeEnd('makeNewAtlas')
                    setCustomAtlas(atlas)
                    setCustomImage(canvas.toDataURL())
                })
            }}>
                <option value={'undefined'} disabled>None</option>
                {legacyVersions.map(version => <option key={version} value={version}>Before {version}</option>)}
            </select>
        </div>}
        <div className='flex flex-col gap-2'>
            <div>
                <div className='text-xl'>Cursor: {cursorName}</div>
            </div>
            <div className='flex gap-2'>
                <div className='text-xl'>Highlight: {highlightStr}</div>
                {currentAtlasTexturesDatalist}
                <input defaultValue='' list="currentAtlasTexturesDatalist" name='texture' className='border border-gray-700 rounded-lg' onChange={(e) => {
                    const name = e.target.value;
                    const texture = currentAtlas.textures[name]
                    console.log('texture', texture)
                    if (!texture) return
                    setHighlightTexture({
                        name,
                        ...texture
                    })
                }} />
            </div>
        </div>
        <div className='flex gap-2 max-sm:flex-col'>
            <canvas
                className='border border-black'
                ref={canvasRef}
                onPointerMove={e => {
                    setData(e, true)
                }}
            />
            <div>
                <div className='flex gap-2 items-center flex-col'>

                </div>
                {/* info block */}
            </div>
        </div>
    </div>
}
