import { getVersionList, MinecraftVersion, install, installAssets, installVersion } from "@xmcl/installer";
import semver from 'semver'
import fs from 'fs'
import { versionToNumber } from './utils';

const main = async () => {
    const latestVersion = (await getVersionList()).versions.find(v => v.type === 'release' || v.id.includes('-rc') || v.id.includes('-pre'))!
    const currentVersion = Object.keys(JSON.parse(fs.readFileSync('./data/data-paths.json', 'utf8'))).filter(v => v !== 'latest').sort((a, b) => {
        return versionToNumber(a) - versionToNumber(b)
    }).at(-1)!
    console.log(currentVersion, latestVersion.id)
    console.log(`::set-output name=shouldContinue::${currentVersion !== latestVersion.id}`)
}

main()
