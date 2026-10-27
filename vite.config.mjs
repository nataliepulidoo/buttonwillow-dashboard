import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins:[react()],
  server:{port:5173,fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/.local-data/**','**/*.xlsx','**/*.xls','**/*.csv']}},
  worker:{format:'es'},
});
