import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ColgoProvider } from './state/ColgoProvider'
import { AuthProvider } from './state/authContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ColgoProvider>
          <App />
        </ColgoProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
