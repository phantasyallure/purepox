import { createContext, useContext, useState, useMemo } from 'react'

const Ctx = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)

  const value = useMemo(
    () => ({
      items,
      open,
      setOpen,
      add: (item) => setItems((l) => [...l, { ...item, key: crypto.randomUUID?.() || String(Date.now() + Math.random()) }]),
      remove: (key) => setItems((l) => l.filter((i) => i.key !== key)),
      clear: () => setItems([]),
      total: items.reduce((s, i) => s + i.total, 0),
    }),
    [items, open]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useCart = () => useContext(Ctx)
