-- Optional sample products (run after schema.sql). Delete them later from the admin.

INSERT OR IGNORE INTO products (id, name_fr, name_ar, desc_fr, desc_ar, bucket_kg, coverage_m2_per_kg, base_price, sort_order) VALUES
('sample-1', 'Époxy Sol Brillant', 'إيبوكسي أرضيات لامع', 'Revêtement de sol époxy brillant, haute résistance, idéal pour garages, ateliers et locaux commerciaux.', 'طلاء أرضيات إيبوكسي لامع عالي المقاومة، مثالي للمرائب والورشات والمحلات التجارية.', 20, 0.4, 28000, 1),
('sample-2', 'Époxy Autolissant 3D', 'إيبوكسي ذاتي التسوية 3D', 'Finition lisse et continue, parfaite pour showrooms, salons et espaces design.', 'تشطيب أملس ومتواصل، مثالي لصالات العرض والصالونات والمساحات العصرية.', 25, 0.25, 45000, 2);

INSERT OR IGNORE INTO colors (id, product_id, name_fr, name_ar, hex, price, sort_order) VALUES
('sc-1', 'sample-1', 'Gris Béton', 'رمادي إسمنتي', '#9aa0a6', 28000, 1),
('sc-2', 'sample-1', 'Noir', 'أسود', '#161616', 29500, 2),
('sc-3', 'sample-1', 'Orange Purepox', 'برتقالي بيوربوكس', '#ec6b14', 31000, 3),
('sc-4', 'sample-1', 'Blanc', 'أبيض', '#f4f4f4', 28000, 4),
('sc-5', 'sample-2', 'Gris Perle', 'رمادي لؤلؤي', '#c9ccd1', 45000, 1),
('sc-6', 'sample-2', 'Anthracite', 'أنثراسيت', '#3a3d42', 46500, 2),
('sc-7', 'sample-2', 'Beige Sable', 'بيج رملي', '#d8c3a5', 45000, 3);
