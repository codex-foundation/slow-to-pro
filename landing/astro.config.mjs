import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://slowtopro.app',
  vite: {
    plugins: [tailwindcss()],
  },
});
