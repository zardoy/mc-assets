import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'

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
        distPath: {
            root: '../data',
        },
    },
    server: {
        strictPort: true,
    },
    plugins: [
        pluginReact(),
    ],
})
