// One-time upgrade of the calculator tables (DECO DZ). Runs automatically from the Worker the first time
// the site is opened after deployment — nothing to paste in the D1 console. Safe to run many times:
// the `meta` flag makes sure it only runs once, so products you delete later never come back.
export const SEED_KEY = 'calc_v2'

export const CALC_COLUMNS = [
  `ALTER TABLE calc_products ADD COLUMN role TEXT`,
  `ALTER TABLE calc_products ADD COLUMN family TEXT`,
  `ALTER TABLE calc_products ADD COLUMN support TEXT`,
  `ALTER TABLE calc_products ADD COLUMN location TEXT`,
  `ALTER TABLE calc_products ADD COLUMN thickness TEXT`,
  `ALTER TABLE calc_products ADD COLUMN colors_from TEXT`,
  `ALTER TABLE calc_products ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE calc_products ADD COLUMN active INTEGER NOT NULL DEFAULT 1`,
]

// [slot, name_fr, name_ar, role, family, support, location, thickness, colors_from, coverage m²/kg, sort, active]
const BUILT_IN = [
  ['primer_epoxy_normal',  'Primaire Époxy Normal',  'برايمر إيبوكسي عادي',   'primer', 'epoxy',        'concrete', null, null, null, 5, 1, 1],
  ['primer_epoxy_traite',  'Primaire Époxy Traité',  'برايمر إيبوكسي معالج',  'primer', 'epoxy',        'smooth',   null, null, null, 5, 2, 1],
  ['primer_pu_normal',     'Primaire Polyuréthane Normal', 'برايمر بولي يوريثان عادي',  'primer', 'polyurethane', 'concrete', null, null, null, 5, 3, 1],
  ['primer_pu_traite',     'Primaire Polyuréthane Traité', 'برايمر بولي يوريثان معالج', 'primer', 'polyurethane', 'smooth',   null, null, null, 5, 4, 1],
  ['epoxy',                'Finition Époxy Filmogène',       'تشطيب إيبوكسي غشائي',        'finition', 'epoxy',        null, 'interior', 'lt1', null,      2.5,  10, 1],
  ['epoxy_raclette',       'Finition Époxy Autolissant',     'تشطيب إيبوكسي ذاتي التسوية', 'finition', 'epoxy',        null, 'interior', 'gt1', 'epoxy',   0.75, 11, 1],
  ['polyurethane',         'Finition Polyuréthane Standard', 'تشطيب بولي يوريثان عادي',    'finition', 'polyurethane', null, 'interior', 'lt1', null,      2.5,  20, 1],
  ['polyurethane_raclette','Finition Polyuréthane Autolissant', 'تشطيب بولي يوريثان ذاتي التسوية', 'finition', 'polyurethane', null, 'interior', 'gt1', 'polyurethane', 0.75, 21, 1],
  ['polyurethane_ext',     'Finition Polyuréthane Anti-UV Extérieur', 'تشطيب بولي يوريثان مضاد للأشعة خارجي', 'finition', 'polyurethane', null, 'exterior', 'lt1', null, 2.5, 30, 1],
]

// prices of the 4 primers (20 kg / 10 kg, DA) — from the supplier price list
const PRIMER_PRICES = {
  primer_epoxy_normal: [37000, 19000],
  primer_epoxy_traite: [42000, 22000],
  primer_pu_normal: [32000, 17000],
  primer_pu_traite: [37000, 19000],
}

export function seedStatements(db) {
  const now = new Date().toISOString()
  const out = []
  for (const [slot, fr, ar, role, family, support, location, thickness, from, cov, sort, active] of BUILT_IN) {
    const price = PRIMER_PRICES[slot]
    // new row (kept if it already exists)
    out.push(db.prepare(
      `INSERT OR IGNORE INTO calc_products (slot,name_fr,name_ar,bucket_kg,small_kg,coverage_m2_per_kg,price,price_small,role,family,support,location,thickness,colors_from,sort_order,active,updated_at)
       VALUES (?,?,?,20,10,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(slot, fr, ar, cov, price ? price[0] : null, price ? price[1] : null, role, family, support, location, thickness, from, sort, active, now))
    // existing row from the old version: fill in its rules (only if not set yet)
    out.push(db.prepare(
      `UPDATE calc_products SET role=?, family=?, support=?, location=?, thickness=?, colors_from=?, sort_order=?, active=? WHERE slot=? AND role IS NULL`
    ).bind(role, family, support, location, thickness, from, sort, active, slot))
  }
  // names that still talk about "+1 mm" become "Autolissant"; the roller epoxy becomes "Filmogène"
  out.push(db.prepare(`UPDATE calc_products SET name_fr='Finition Époxy Autolissant', name_ar='تشطيب إيبوكسي ذاتي التسوية' WHERE slot='epoxy_raclette' AND name_fr LIKE '%mm%'`))
  out.push(db.prepare(`UPDATE calc_products SET name_fr='Finition Polyuréthane Autolissant', name_ar='تشطيب بولي يوريثان ذاتي التسوية' WHERE slot='polyurethane_raclette' AND name_fr LIKE '%mm%'`))
  out.push(db.prepare(`UPDATE calc_products SET name_fr='Finition Époxy Filmogène', name_ar='تشطيب إيبوكسي غشائي' WHERE slot='epoxy' AND name_fr='Finition Époxy'`))
  // the 2 old primers (by surface only) are replaced by the 4 primers above: hidden, not deleted
  out.push(db.prepare(`UPDATE calc_products SET role='primer', family='both', support=CASE slot WHEN 'primer_normal' THEN 'concrete' ELSE 'smooth' END, active=0, sort_order=90 WHERE slot IN ('primer_normal','primer_traite') AND role IS NULL`))
  out.push(db.prepare(`UPDATE calc_products SET role='primer', family='epoxy', support='both', active=0, sort_order=91 WHERE slot='primer_epoxy' AND role IS NULL`))
  out.push(db.prepare(`UPDATE calc_products SET role='primer', family='polyurethane', support='both', active=0, sort_order=92 WHERE slot='primer_polyurethane' AND role IS NULL`))
  out.push(db.prepare(`INSERT OR IGNORE INTO meta (k, v) VALUES (?, ?)`).bind(SEED_KEY, now))
  return out
}
