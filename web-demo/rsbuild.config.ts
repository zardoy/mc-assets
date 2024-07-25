import { RsbuildPlugin, defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import fs from 'fs'
import { filesize } from 'filesize'

export default defineConfig({
    html: {
        template: './index.html',
    },
    source: {
        entry: {
            index: './src/index.tsx',
        },
    },
    output: {
        cleanDistPath: false,
        dataUriLimit: 1024 * 1024 * 1024, // 1GB
        inlineScripts: true,
        inlineStyles: true,
        distPath: {
            root: '../data',
        },
    },
    server: {
    },
    plugins: [
        pluginReact(),
        {
            name: 'a',
            setup(build) {
                build.onAfterBuild(({ stats }) => {
                    const bundleSize = stats.toJson().assets.find(asset => asset.name.endsWith('.html')).size;
                    fs.writeFileSync('../temp/bundleWebAppSize.txt', `${filesize(bundleSize)}`)
                })
            }
        } satisfies RsbuildPlugin,
    ],
})
