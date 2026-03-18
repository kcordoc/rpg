import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite';

/**
 * Vite config for building the embed SDK (embed.js).
 * Produces a single IIFE script that creators drop onto their website.
 *
 * Usage: vite build --config vite/config.embed.mjs
 * Output: dist/embed.js
 */
export default defineConfig({
    build: {
        lib: {
            entry: fileURLToPath(new URL('../src/platform/embed.js', import.meta.url)),
            name: 'QuestForgeEmbed',
            formats: ['iife'],
            fileName: () => 'embed.js',
        },
        outDir: 'dist',
        emptyOutDir: false, // Don't wipe the main build output
        minify: 'terser',
        terserOptions: {
            compress: { passes: 2 },
            mangle: true,
            format: { comments: false },
        },
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('../src', import.meta.url)),
        },
    },
    logLevel: 'warning',
});
