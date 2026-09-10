import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import './index.css'
import './styles'
import App from './App.tsx'
import ApiDocApp from './ApiDocApp.tsx'
import SharePreviewApp from './SharePreviewApp.tsx'
import { AppThemeProvider } from './AppThemeProvider'
import { installPreloadErrorReload } from './preloadReload'

// 社区版入口：只挂主应用 / API 文档 / 分享预览。
// 内容台（/admin）与系统台（/config）属商业版，本树不含对应代码。

installPreloadErrorReload()

const isApiDocs = window.location.pathname.startsWith('/api-docs')
const isSharePreview = new URLSearchParams(window.location.search).has('share')

// 注意：不使用 StrictMode（开发模式下会双次挂载组件，导致 useDelayedFlag 的骨架屏
// 计时器出错、auth effect 重复执行，造成页面闪烁。生产构建中 StrictMode 本身无开销，
// 但本树的组件代码已具备幂等性，不需要它来暴露潜在的 effect 规范问题。
createRoot(document.getElementById('root')!).render(
  <AppThemeProvider forceLight={isSharePreview}>
    {isSharePreview ? <SharePreviewApp /> : isApiDocs ? <ApiDocApp /> : <App />}
  </AppThemeProvider>,
)
