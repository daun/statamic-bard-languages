import statamic from '@statamic/cms/vite-plugin';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    plugins: [
        statamic(),
        laravel({
            input: ['resources/js/addon.ts', 'resources/css/addon.css'],
            publicDirectory: 'resources/dist',
        }),
    ],
    build: {
        // Keeps :dir() in addon.css, which older targets rewrite into a list of :lang() guesses.
        cssTarget: ['chrome120', 'edge120', 'firefox120', 'safari16.4'],
    },
    test: {
        include: ['tests/js/**/*.test.ts'],
        environment: 'happy-dom',
    },
    lint: {
        ignorePatterns: ['resources/dist/**', 'vendor/**', 'playground/**'],
        options: {
            typeAware: true,
            typeCheck: true,
        },
    },
    fmt: {
        singleQuote: true,
        tabWidth: 4,
        printWidth: 120,
        ignorePatterns: [
            'resources/dist/**',
            'vendor/**',
            'playground/**',
            'composer.json',
            'composer.lock',
            'package-lock.json',
            '*.md',
        ],
    },
});
