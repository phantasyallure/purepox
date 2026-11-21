-- DECO DZ — D1 console: fix products that look hidden in Administration
-- Paste each BLOCK on its own in  Cloudflare → D1 → purepox → Console → Execute.
-- Blocks 1 and 2 are safe (they never change what is visible on the site).

-- ========== BLOCK 1 — SEE what is in the database (read only) ==========
SELECT p.slot, p.role, p.active, p.sort_order, p.name_fr, p.price, p.family, p.support, p.location, p.thickness,
       (SELECT COUNT(*) FROM calc_colors c WHERE c.slot = COALESCE(p.colors_from, p.slot)) AS nb_couleurs
FROM calc_products p
ORDER BY p.role, p.sort_order;

-- ========== BLOCK 2 — REPAIR rows created without a type (they were invisible) ==========
UPDATE calc_products SET role = CASE WHEN slot LIKE 'primer%' THEN 'primer' ELSE 'finition' END WHERE role IS NULL OR role = '';
UPDATE calc_products SET family = 'both' WHERE family IS NULL OR family = '';
UPDATE calc_products SET support = 'both' WHERE role = 'primer' AND (support IS NULL OR support = '');
UPDATE calc_products SET location = 'both' WHERE role = 'finition' AND (location IS NULL OR location = '');
UPDATE calc_products SET thickness = 'both' WHERE role = 'finition' AND (thickness IS NULL OR thickness = '');

-- ========== BLOCK 3 — OPTIONAL: show again the 9 standard products if they were hidden ==========
-- (the 4 old primers primer_normal / primer_traite / primer_epoxy / primer_polyurethane stay hidden on purpose)
UPDATE calc_products SET active = 1 WHERE slot IN (
  'primer_epoxy_normal', 'primer_epoxy_traite', 'primer_pu_normal', 'primer_pu_traite',
  'epoxy', 'epoxy_raclette', 'polyurethane', 'polyurethane_raclette', 'polyurethane_ext'
);
UPDATE calc_colors SET active = 1 WHERE active = 0;
