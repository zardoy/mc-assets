export const versionToNumber = (ver: string) => {
    // simply removes the -pre, -rc, etc. from the version
    ver = ver.split('-')[0]!
    let [x, y = '0', z = '0'] = ver.split('.') as [string, string?, string?];
    return parseInt(`${x.padStart(2, '0')}${y.padStart(2, '0')}${z.padStart(2, '0')}`, 10)
}
