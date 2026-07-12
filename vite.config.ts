import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client
          'supabase': ['@supabase/supabase-js'],
          // UI library components
          'ui-library': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
          ],
          // PDF processing
          'pdf-processing': ['html2canvas'],
          // Utility libraries
          'utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
          // Icons
          'icons': ['lucide-react'],
        }
      }
    },
    // Increase chunk size warning limit to 1000KB
    chunkSizeWarningLimit: 1000,
  },
  // ponytail: SPA fallback for react-router - serve index.html for all routes
  // @ts-ignore - Vite types incomplete
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // For HTML requests, serve index.html (SPA fallback)
      if (req.headers.accept?.includes('text/html') && !req.url?.includes('.')) {
        req.url = '/index.html';
      }
      next();
    });
  },
}));
