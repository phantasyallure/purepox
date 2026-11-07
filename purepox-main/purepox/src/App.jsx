import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import OrderModal from './components/OrderModal'
import Home from './pages/Home'
import Product from './pages/Product'
import Admin from './pages/Admin'
import { fetchSettings } from './lib/data'

export default function App() {
  const [settings, setSettings] = useState(null)
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')

  useEffect(() => { fetchSettings().then(setSettings).catch(() => setSettings({})) }, [])

  return (
    <>
      {!isAdmin && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<Home settings={settings} />} />
          <Route path="/produit/:id" element={<Product />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Home settings={settings} />} />
        </Routes>
      </main>
      {!isAdmin && <Footer settings={settings} />}
      {!isAdmin && <OrderModal />}
    </>
  )
}
