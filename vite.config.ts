import { defineConfig } from 'vite';
import { resolve } from 'path';
import UnoCSS from 'unocss/vite';

export default defineConfig({
  plugins: [
    UnoCSS(),
  ],

  root: '.',
  publicDir: 'public',

  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
    assetsInlineLimit: 0,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@scene': resolve(__dirname, 'src/scene'),
      '@layout': resolve(__dirname, 'src/layout'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@text': resolve(__dirname, 'src/text'),
      '@tools': resolve(__dirname, 'src/tools'),
      '@persistence': resolve(__dirname, 'src/persistence'),
      '@operations': resolve(__dirname, 'src/operations'),
      '@runtime': resolve(__dirname, 'src/runtime'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@collaboration': resolve(__dirname, 'src/collaboration'),
      '@devtools': resolve(__dirname, 'src/devtools'),
      '@animation': resolve(__dirname, 'src/animation'),
      '@prototype': resolve(__dirname, 'src/prototype'),
      '@ai': resolve(__dirname, 'src/ai'),
      '@templates': resolve(__dirname, 'src/templates'),
      '@tokens': resolve(__dirname, 'src/tokens'),
      '@semantic': resolve(__dirname, 'src/semantic'),
    },
  },

  optimizeDeps: {
    exclude: ['harfbuzzjs'],
  },

  assetsInclude: ['**/*.glsl', '**/*.wasm'],

  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    hmr: {
      overlay: false, // Disable error overlay if causing issues
    },
    proxy: {
      // Proxy Anthropic API requests to bypass CORS in development
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Forward all headers from the original request
            const headers = req.headers;
            if (headers['x-api-key']) {
              proxyReq.setHeader('x-api-key', headers['x-api-key'] as string);
            }
            if (headers['anthropic-version']) {
              proxyReq.setHeader('anthropic-version', headers['anthropic-version'] as string);
            }
          });
        },
      },
      // Proxy OpenAI API requests
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
      },
    },
  },
});
