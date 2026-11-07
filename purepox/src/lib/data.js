import { supabase, hasSupabase } from './supabase'
import { demoProducts, demoSettings } from './demo'

export async function fetchCatalogue({ includeInactive = false } = {}) {
  if (!hasSupabase) return demoProducts
  let q = supabase.from('products').select('*, colors(*)').order('sort_order').order('created_at')
  if (!includeInactive) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return (data || []).map((p) => ({
    ...p,
    colors: (p.colors || [])
      .filter((c) => includeInactive || c.active)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }))
}

export async function fetchSettings() {
  if (!hasSupabase) return demoSettings
  const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
  return data || demoSettings
}

export async function submitOrder({ name, phone, items, total }) {
  if (!hasSupabase) {
    console.info('[demo] order', { name, phone, items, total })
    return
  }
  const { error } = await supabase
    .from('orders')
    .insert({ customer_name: name, phone, items, total })
  if (error) throw error
}
