import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';
import {fileURLToPath} from 'node:url';
export default defineConfig({plugins:[react(),VitePWA({registerType:'prompt',includeAssets:['icon.svg','icon-192.png','icon-512.png'],manifest:{name:'CareRoute Visit Planner',short_name:'CareRoute',description:'Plan the hospital visit before leaving home. Fictional-data demonstration.',theme_color:'#143a40',background_color:'#f5f6f2',display:'standalone',start_url:'/',icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'}]},workbox:{globPatterns:['**/*.{js,css,html,svg,woff2}'],navigateFallback:'index.html',runtimeCaching:[],cleanupOutdatedCaches:true}})],resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},test:{environment:'jsdom',include:['src/**/*.test.ts'],restoreMocks:true},server:{port:5173}});

