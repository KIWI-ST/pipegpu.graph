import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({

    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'node_modules/cesium/Build/Cesium/**/*',
                    dest: 'node_modules/.vite/deps/'
                },
            ]
        })
    ]

});