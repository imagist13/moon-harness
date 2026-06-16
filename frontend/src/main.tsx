import ReactDOM from 'react-dom/client'
import '@fontsource-variable/geist'
import { Toaster } from '@/components/ui/sonner'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Toaster position="top-center" gap={24} duration={5000} visibleToasts={5} />
  </>,
)
