import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'date-fns',
      'qrcode.react',
      'recharts',
      'lodash',
      'lodash/get',
      'lodash/set',
      'lodash/merge',
      'lodash/cloneDeep',
      'lodash/isEqual',
      'lodash/throttle',
    ],
    force: true,
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/lodash/, /recharts/],
    },
  },
})
