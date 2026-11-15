-- Purepox — calculator pricing update (run ONCE in the D1 console, after deploying the new code)
-- Replaces the colours/prices of the 3 coloured finishes and creates the new products.
-- Wholesale price is left empty on purpose: the site applies retail -5 % from 200 m².
-- +1 mm (raclette) finishes have no colours of their own: they use the -1 mm colours (same price).

-- 1) New products (kept if they already exist). Coverage per kg: raclette 20 kg = 15 m² → 0.75 · roller 20 kg = 50 m² → 2.5 · primer 20 kg = 100 m² → 5
INSERT OR IGNORE INTO calc_products (slot, name_fr, name_ar, bucket_kg, small_kg, coverage_m2_per_kg, updated_at) VALUES
('primer_epoxy',          'Primaire Époxy',                          'برايمر إيبوكسي',                     20, 10, 5,    datetime('now')),
('primer_polyurethane',   'Primaire Polyuréthane',                   'برايمر بولي يوريثان',                20, 10, 5,    datetime('now')),
('epoxy_raclette',        'Finition Époxy Raclette (+1 mm)',         'تشطيب إيبوكسي راكلات (+1 مم)',        20, 10, 0.75, datetime('now')),
('polyurethane_raclette', 'Finition Polyuréthane Raclette (+1 mm)',  'تشطيب بولي يوريثان راكلات (+1 مم)',   20, 10, 0.75, datetime('now')),
('polyurethane_ext',      'Finition Polyuréthane Anti-UV Extérieur', 'تشطيب بولي يوريثان مضاد للأشعة خارجي', 20, 10, 2.5,  datetime('now'));

-- 2) Existing finishes: make sure the sizes are right (the "polyurethane" slot = Standard, interior)
UPDATE calc_products SET name_fr = 'Finition Polyuréthane Standard', name_ar = 'تشطيب بولي يوريثان عادي' WHERE slot = 'polyurethane';
UPDATE calc_products SET bucket_kg = 20, small_kg = 10, coverage_m2_per_kg = 2.5 WHERE slot IN ('epoxy', 'polyurethane', 'polyurethane_ext');
UPDATE calc_products SET bucket_kg = 20, small_kg = 10, coverage_m2_per_kg = 0.75 WHERE slot IN ('epoxy_raclette', 'polyurethane_raclette');

-- 3) Colours + prices (20 kg bucket, DA)
DELETE FROM calc_colors WHERE slot IN ('epoxy', 'polyurethane', 'polyurethane_ext');

-- Époxy (intérieur uniquement)
INSERT INTO calc_colors (id, slot, name_fr, name_ar, hex, price, active, sort_order) VALUES
('ep-7035', 'epoxy', 'RAL 7035', 'RAL 7035', '#cbd0cc', 44000, 1, 0),
('ep-1015', 'epoxy', 'RAL 1015', 'RAL 1015', '#e6d2b5', 47000, 1, 1),
('ep-5012', 'epoxy', 'RAL 5012', 'RAL 5012', '#0089b6', 55000, 1, 2),
('ep-6027', 'epoxy', 'RAL 6027', 'RAL 6027', '#7ebab5', 51000, 1, 3),
('ep-7032', 'epoxy', 'RAL 7032', 'RAL 7032', '#b8b799', 47000, 1, 4),
('ep-7040', 'epoxy', 'RAL 7040', 'RAL 7040', '#9da3a6', 47000, 1, 5);

-- Polyuréthane Standard (intérieur)
INSERT INTO calc_colors (id, slot, name_fr, name_ar, hex, price, active, sort_order) VALUES
('pu-7035', 'polyurethane', 'RAL 7035', 'RAL 7035', '#cbd0cc', 39500, 1, 0),
('pu-blanc', 'polyurethane', 'Blanc',   'أبيض',     '#f4f4f4', 42000, 1, 1),
('pu-1015', 'polyurethane', 'RAL 1015', 'RAL 1015', '#e6d2b5', 42000, 1, 2),
('pu-5012', 'polyurethane', 'RAL 5012', 'RAL 5012', '#0089b6', 56000, 1, 3),
('pu-6027', 'polyurethane', 'RAL 6027', 'RAL 6027', '#7ebab5', 50000, 1, 4),
('pu-7032', 'polyurethane', 'RAL 7032', 'RAL 7032', '#b8b799', 42000, 1, 5),
('pu-7040', 'polyurethane', 'RAL 7040', 'RAL 7040', '#9da3a6', 42000, 1, 6);

-- Polyuréthane Anti-UV (extérieur, rouleau uniquement)
INSERT INTO calc_colors (id, slot, name_fr, name_ar, hex, price, active, sort_order) VALUES
('px-7035', 'polyurethane_ext', 'RAL 7035', 'RAL 7035', '#cbd0cc', 49000, 1, 0),
('px-noir', 'polyurethane_ext', 'Noir',     'أسود',     '#161616', 64000, 1, 1),
('px-blanc','polyurethane_ext', 'Blanc',    'أبيض',     '#f4f4f4', 49000, 1, 2),
('px-1018', 'polyurethane_ext', 'RAL 1018', 'RAL 1018', '#f8f32b', 61000, 1, 3),
('px-6027', 'polyurethane_ext', 'RAL 6027', 'RAL 6027', '#7ebab5', 66000, 1, 4),
('px-5012', 'polyurethane_ext', 'RAL 5012', 'RAL 5012', '#0089b6', 59000, 1, 5);

-- 4) Primer prices: not given yet → enter them in Admin → Calculateur (Primaire Époxy / Primaire Polyuréthane).
--    To reuse your old primer prices instead, uncomment (check which old primer matches which):
-- UPDATE calc_products SET price = (SELECT price FROM calc_products WHERE slot = 'primer_normal')  WHERE slot = 'primer_epoxy';
-- UPDATE calc_products SET price = (SELECT price FROM calc_products WHERE slot = 'primer_traite')  WHERE slot = 'primer_polyurethane';
