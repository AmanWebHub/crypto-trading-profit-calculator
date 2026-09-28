import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/crypto-trading-profit-calculator/', // must match your GitHub repo name
});
