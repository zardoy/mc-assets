import fs from 'fs'
import path from 'path/posix'
import { ItemDefinition } from './consumer/types'

const rawData = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))

interface BuilderOptions {
    dataKey: string // e.g. 'items/', 'models/', etc.
    outputPath: string // where to save the output file
    processFile?: (content: any) => any // optional transform function
    filterName?: (name: string) => boolean
}

export const buildVersionedData = async (options: BuilderOptions) => {
    const { dataKey, outputPath, processFile, filterName } = options
    const versionedData = {} as Record<string, Record<string, any>>
    const versions = Object.keys(rawData).filter(v => v !== 'latest')

    // Process each version including latest
    for (const version of [...versions, 'latest']) {
        versionedData[version] = {}
        const versionData = rawData[version]

        if (!versionData || !versionData[dataKey]) continue

        // Process each file in the version
        for (const [relativePath, filePath] of Object.entries(versionData[dataKey])) {
            if (filterName && !filterName(relativePath)) continue
            // Read the file
            const fullFilePath = path.join('data', filePath)
            const content = JSON.parse(fs.readFileSync(fullFilePath, 'utf8'))

            const nameWithoutExtension = relativePath.split('.').slice(0, -1).join('.')
            // Store the data, optionally transformed
            const processedContent = processFile ? processFile(content) : content
            versionedData[version][nameWithoutExtension] = processedContent
        }
    }

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })

    // Write the data to a JSON file
    fs.writeFileSync(outputPath, JSON.stringify(versionedData, null, 4))

    return versionedData
}

// Example usage for item definitions
export const generateItemDefinitions = async () => {
    return buildVersionedData({
        dataKey: 'items/',
        outputPath: './dist/itemDefinitions.json',
        filterName: (name) => name.endsWith('.json')
    })
}

generateItemDefinitions()
