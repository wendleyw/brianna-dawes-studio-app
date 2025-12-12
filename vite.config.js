import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@features': resolve(__dirname, 'src/features'),
            '@shared': resolve(__dirname, 'src/shared'),
            '@config': resolve(__dirname, 'src/shared/config'),
            '@app': resolve(__dirname, 'src/app'),
        },
    },
    css: {
        modules: {
            localsConvention: 'camelCase',
        },
    },
    server: {
        port: 3000,
        open: true,
        // Allow Miro to embed the app
        cors: true,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        // Multiple entry points for Miro app
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                app: resolve(__dirname, 'app.html'),
                'board-modal': resolve(__dirname, 'board-modal.html'),
                'admin-modal': resolve(__dirname, 'admin-modal.html'),
            },
        },
    },
});
