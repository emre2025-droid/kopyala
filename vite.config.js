import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { apiServer } from './api.js';

// Custom Vite plugin to integrate the Express API server as middleware
const expressApiPlugin = {
  name: 'express-api-server',
  configureServer(server) {
    // Mount the API server on the /api path.
    // All requests to '/api/...' will be handled by our Express app.
    server.middlewares.use('/api', apiServer);
  }
};


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Add our custom plugin to handle API requests
    expressApiPlugin
  ],
  // The server.proxy option is no longer needed as the API is now served
  // by the same dev server, fixing the fetch error.
  server: {},
})
