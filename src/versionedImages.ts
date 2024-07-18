import fs from 'fs'
import looksSame from 'looks-same'
import { join } from 'path'

export const makeVersionedImages = async (rootDir: string, versions: string[], filterFiles = (file: string) => file.endsWith('.png')) => {
    let saving = 0
    let overallsize = 0
    let prevItemsDir
    let prevVersion
    let fullItemsMap = {} as Record<string, string[]>

    for (const version of versions) {
        for (const item of fs.readdirSync(rootDir).filter(filterFiles)) {
            const prevItemPath = !prevItemsDir ? undefined : join(prevItemsDir, item)
            const itemSize = fs.statSync(join(rootDir, item)).size
            if (prevItemPath && fs.existsSync(prevItemPath) && (await looksSame(join(rootDir, item), prevItemPath, { strict: true })).equal) {
                saving += itemSize
            } else {
                fullItemsMap[version] ??= []
                fullItemsMap[version]!.push(item)
            }
            overallsize += itemSize
        }
        prevItemsDir = rootDir
        prevVersion = version
    }

    const latestVersion = versions[versions.length - 1]!

    // const previousVersionsMap =

    return {
        fullItemsMap,
        saving,
        overallsize,
        latest: fullItemsMap[latestVersion],
        legacy: Object.fromEntries(Object.entries(fullItemsMap).map(([ver, items]) => [ver !== latestVersion, items]))
    }
}
