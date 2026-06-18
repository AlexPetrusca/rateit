import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const BACKEND_HOST = env.BACKEND_HOST || 'localhost';
    const BACKEND_PORT = env.BACKEND_PORT || '3001';

    return {
        plugins: [react(), svgr()],
        server: {
            port: 3000,
            host: true,
            watch: {
                usePolling: true,
                interval: 300
            },
            proxy: {
                '/api': {
                    target: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
                    changeOrigin: true,
                    secure: false,
                    configure: (proxy) => {
                        proxy.on('error', (err) => console.log('proxy error', err));
                        proxy.on('proxyReq', (proxyReq, req) => console.log('Sending Request:', req.method, req.url));
                        proxy.on('proxyRes', (proxyRes, req) => console.log('Received Response:', proxyRes.statusCode, req.url));
                    },
                },
                '/auth': {
                    target: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
                    changeOrigin: true,
                    secure: false,
                    configure: (proxy) => {
                        proxy.on('error', (err) => console.log('proxy error', err));
                        proxy.on('proxyReq', (proxyReq, req) => console.log('Sending Request:', req.method, req.url));
                        proxy.on('proxyRes', (proxyRes, req) => console.log('Received Response:', proxyRes.statusCode, req.url));
                    },
                }
            }
        }
    };
});
