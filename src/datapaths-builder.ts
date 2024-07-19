import { getVersionList, MinecraftVersion, install, installAssets, installVersion } from "@xmcl/installer";
import { MinecraftLocation, Version, MinecraftFolder } from "@xmcl/core";
import { versionToNumber } from './utils';
import fs from 'fs';
import path from 'path';
import NodeStreamZip from 'node-stream-zip';
import looksSame from 'looks-same'

let prevVersion: MinecraftVersion | undefined;
// everything for data/
let versionsDataPaths = {
    latest: {}
} as {
    [version: string]: {
        [dataType: string]: {
            [file: string]: string
        }
    }
}
try {
    versionsDataPaths = JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))
} catch (e) {
    console.log('data-paths.json not found, creating...')
}
const processVersionData = async (version: MinecraftVersion, isLatest: boolean) => {
    if (versionsDataPaths[version.id]) return
    console.log('check version', version.id)
    const resolvedVersion = await installVersion(version, 'temp', { side: 'client', })
    const unarchivePath = path.join(...resolvedVersion.pathChain, 'out');
    if (!fs.existsSync(unarchivePath)) {
        console.log(`extracting jar ${version.id}`);
        await extractJar(path.join(...resolvedVersion.pathChain, `${resolvedVersion.id}.jar`), unarchivePath)
        console.log(`extracting done ${version.id}`);
    }
    // fs.renameSync(path.join(...resolvedVersion.pathChain, 'versions', resolvedVersion.id), path.join(...resolvedVersion.pathChain, 'versions', 'latest'));

    const versionCopyPaths = {
        'assets/minecraft/textures/': 'textures/',
        'assets/minecraft/particles/': 'textures/particles/',
        'assets/minecraft/blockstates/': 'blockstates/',
        'assets/minecraft/models/': 'models/',
    }
    const allVersionsMergedData = {
        // 'assets/minecraft/lang/en_us.json',
        'data/minecraft/jukebox_song/': 'jukebox_song/',
    }
    const copyLatest = {
        'assets/minecraft/texts/splashes.txt': 'texts/splashes.txt',
    }
    versionsDataPaths[version.id] = {}
    for (const [versionedPathSrc, versionedPathDst] of Object.entries(versionCopyPaths)) {
        const patchAddPath = (addPath: string) => {
            // remove inconsistent paths between old and new versions (item/ vs items/)
            if (versionedPathDst === 'textures/') {
                return addPath.replace(/^block($|\/)/, 'blocks').replace(/^item($|\/)/, 'items')
            }
            return addPath
        }

        const dataPathType = versionedPathDst
        versionsDataPaths.latest![dataPathType] ??= {}
        const processDir = async (addPath: string) => {
            const sourcePath = path.join(...resolvedVersion.pathChain, 'out', versionedPathSrc, addPath);
            if (!fs.existsSync(sourcePath)) return;
            const files = fs.readdirSync(sourcePath, { withFileTypes: true })
            for (const fileInfo of files) {
                if (!fileInfo.isFile()) {
                    await processDir(path.join(addPath, fileInfo.name));
                    continue;
                }
                const file = fileInfo.name;
                const sourceFilePath = path.join(sourcePath, file);
                const targetFilePath = path.join('data', resolvedVersion.id, versionedPathDst, addPath, file);
                const fileKey = path.join(patchAddPath(addPath), file)
                if (prevVersion) {
                    const latestTargetFilePathRelative = versionsDataPaths.latest![dataPathType]![fileKey]
                    const latestTargetFilePath = latestTargetFilePathRelative && path.join('data', latestTargetFilePathRelative);

                    const skipExists = () => {
                        // console.debug('skipping', file);
                        // versionsDataPaths[version.id]![dataPathType]![fileKey] = prevTargetFilePathRelative!
                    }
                    if (latestTargetFilePath) {
                        // if (!fs.existsSync(latestTargetFilePath)) throw new Error(`latestTargetFilePath does not exist: ${latestTargetFilePath}`)
                        const isImage = file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.gif')
                        if (isImage) {
                            if ((await looksSame(sourceFilePath, latestTargetFilePath, { strict: true })).equal) {
                                skipExists()
                                continue;
                            }
                        } else {
                            if (fs.readFileSync(sourceFilePath, 'utf8') === fs.readFileSync(latestTargetFilePath, 'utf8')) {
                                skipExists()
                                continue;
                            }
                        }
                        versionsDataPaths[version.id] ??= {}
                        versionsDataPaths[version.id]![dataPathType] ??= {}
                        versionsDataPaths[version.id]![dataPathType]![fileKey] = latestTargetFilePathRelative
                    }
                }
                versionsDataPaths.latest![dataPathType]![fileKey] = path.join(version.id, versionedPathDst, addPath, file)
                fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
                fs.copyFileSync(sourceFilePath, targetFilePath);
            }
        }
        await processDir('');
    }
    for (const [src, dst] of Object.entries(allVersionsMergedData)) {
        // output: always latest/dst
        // if txt: merge lines, if dir: copy all files from all versions, if json: merge all jsons
        const srcPath = path.join(...resolvedVersion.pathChain, 'out', src);
        const dstPath = path.join('data', 'latest', dst);
        if (!fs.existsSync(srcPath)) continue;
        if (fs.statSync(srcPath).isDirectory()) {
            fs.mkdirSync(dstPath, { recursive: true });
            const files = fs.readdirSync(srcPath, { withFileTypes: true })
            for (const fileInfo of files) {
                if (!fileInfo.isFile()) {
                    continue;
                }
                const file = fileInfo.name;
                const sourceFilePath = path.join(srcPath, file);
                const targetFilePath = path.join(dstPath, file);
                fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
                fs.copyFileSync(sourceFilePath, targetFilePath);
            }
            continue
        }
    }
    if (isLatest) {
        for (const [src, dst] of Object.entries(copyLatest)) {
            const srcPath = path.join(...resolvedVersion.pathChain, 'out', src);
            const dstPath = path.join('data', 'latest', dst);
            fs.mkdirSync(path.dirname(dstPath), { recursive: true });
            fs.copyFileSync(srcPath, dstPath);
        }
    }
    prevVersion = version;
    console.log(`done ${version.id}`);
}

const fromPath = (...paths: string[]) => (...newPaths: string[]) => path.join(...paths, ...newPaths);

const getRelativePath = (absolute: string, relativeTo: string) => {
    const relative = path.relative(relativeTo, absolute);
    if (relative.startsWith('..')) throw new Error(`relative path is outside of relativeTo: ${relative}`);
    return relative;
}

interface CustomExtractor {
    name: string;
    input: string;
    outputFile: string;
    extractor: (input: string) => Promise<string>;
}

const customExtracters = []

const extractJar = (filePath, outputPath) => {
    return new Promise<void>((resolve, reject) => {
        const zip = new NodeStreamZip({
            file: filePath,
            storeEntries: true
        });

        zip.on('ready', () => {
            zip.extract(null, outputPath, err => {
                if (err) {
                    console.log('Extraction error:', err);
                    reject(err);
                } else {
                    // console.log('Extraction complete');
                    resolve();
                }
                zip.close();
            });
        });

        zip.on('error', err => {
            console.error('Error:', err);
        });
    });
};

// --- main ---

const main = async () => {
    fs.mkdirSync(path.join('temp', 'versions'), { recursive: true });

    // also include latest pre-release or rc
    const versionsRaw = (await getVersionList()).versions;
    const versions = versionsRaw.filter((v) => {
        if (versionToNumber(v.id) < versionToNumber("1.7.10")) return false;
        return v.type === "release";
    }).reverse() // from oldest to newest // from oldest to newest
    const latestVersionRaw = versionsRaw[0]!
    if (latestVersionRaw.type === 'snapshot' && (latestVersionRaw.id.includes('-pre') || latestVersionRaw.id.includes('-rc'))) {
        versions.push(latestVersionRaw)
    }
    const latest = versions.at(-1)!;
    let i = 0
    for (const version of versions) {
        await processVersionData(version, version === latest);
    }

    console.log('done');
    fs.writeFileSync(path.join('./data/data-paths.json'), JSON.stringify(versionsDataPaths, null, 4));
}

main();
