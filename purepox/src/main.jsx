import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'

const Router = import.meta.env.VITE_HASH ? HashRouter : BrowserRouter
import App from './App'
import { LangProvider } from './lib/i18n'
import { CartProvider } from './lib/cart'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <LangProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </LangProvider>
    </Router>
  </React.StrictMode>
)
