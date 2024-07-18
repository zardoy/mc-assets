import { useRef, useState } from 'react'
import blockStatesModels from '../../../dist/blockStatesModels.json'
import itemsAtlases from '../../../dist/itemsAtlases.json'
import itemsAtlasLatest from '../../../dist/itemsAtlasLatest.png'
import itemsAtlasLegacy from '../../../dist/itemsAtlasLegacy.png'

export default function Items() {
    const canvasRef = useRef<HTMLCanvasElement>(null!)
    const [activeInfo, setActiveInfo] = useState<string[]>()

    return <div>
        <canvas ref={canvasRef} />
    </div>
}
