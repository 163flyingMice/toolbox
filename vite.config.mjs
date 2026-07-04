import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function stockQuotesMiddleware() {
  return {
    name: 'stock-quotes-middleware',
    configureServer(server) {
      server.middlewares.use('/api/stock-quotes', async (req, res) => {
        try {
          const fn = require('./cloudfunctions/stock-quotes');
          const requestUrl = new URL(req.url || '', 'http://127.0.0.1');
          const queryStringParameters = Object.fromEntries(requestUrl.searchParams.entries());
          const result = await fn.main({
            httpMethod: req.method || 'GET',
            queryStringParameters
          });

          res.statusCode = result.statusCode || 200;
          Object.entries(result.headers || {}).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
          res.end(result.body || '');
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            quotes: [],
            message: error?.message || '本地股票代理异常'
          }));
        }
      });
    }
  };
}

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  plugins: [stockQuotesMiddleware(), viteSingleFile()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    assetsInlineLimit: 10000000,
    cssCodeSplit: false,
  },
  server: {
    port: 5173
  },
  preview: {
    port: 4173
  }
});
