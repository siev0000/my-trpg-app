import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    root: 'public',
    publicDir: false,
    plugins: [vue()],
    server: {
        host: true,
        port: 5173,
        proxy: {
            '/api': 'http://127.0.0.1:3001',
        },
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'public/index.html'),
                story: resolve(__dirname, 'public/story.html'),
                load: resolve(__dirname, 'public/load.html'),
            },
        },
    },
});
