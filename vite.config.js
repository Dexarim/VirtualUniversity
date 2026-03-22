import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',      // Доступен со всех IP
    port: 5173,            // Порт (измени на нужный)
    open: false             // Автоматически открыть в браузере
  }
})
