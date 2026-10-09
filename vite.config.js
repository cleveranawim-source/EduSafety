import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 배포 화면의 보안 정책 — Vercel은 vercel.json 헤더로도 같은 정책을 보내지만, GitHub Pages처럼
// 헤더를 붙일 수 없는 곳을 위해 빌드한 index.html 에도 넣는다 (개발 서버는 인라인 스크립트를 써서 제외).
// 심사자 API 키를 입력받는 화면이라 외부 스크립트 주입을 막는 것이 핵심이다.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "connect-src 'self' https://api.github.com https://raw.githubusercontent.com https://api.anthropic.com",
  "img-src 'self' data:",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')

const cspMeta = () => ({
  name: 'edusafe-csp-meta',
  apply: 'build',
  transformIndexHtml: (html) => html.replace(
    '<meta charset="UTF-8" />',
    `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
  ),
})

export default defineConfig({
  plugins: [react(), cspMeta()],
  base: './',
  publicDir: false,
  build: { outDir: 'client-dist' },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
      '/verify': 'http://localhost:3000',
    },
  },
})
