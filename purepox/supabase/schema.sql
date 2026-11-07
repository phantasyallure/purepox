-- Purepox — run this whole file once in Supabase > SQL Editor

create extension if not exists "pgcrypto";

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name_fr text not null,
  name_ar text not null default '',
  desc_fr text default '',
  desc_ar text default '',
  image_url text,
  bucket_kg numeric not null default 20,          -- kg per bucket
  coverage_m2_per_kg numeric not null default 0.5, -- m² covered by 1 kg
  base_price numeric not null default 0,           -- price per bucket (fallback if a color has none)
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name_fr text not null,
  name_ar text not null default '',
  hex text not null default '#cccccc',
  price numeric,                                   -- price per bucket for this color
  active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  items jsonb not null,
  total numeric not null default 0,
  status text not null default 'new',
  created_at timestamptz default now()
);

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  phone text default '',
  phone2 text default '',
  email text default '',
  whatsapp text default '',
  facebook text default '',
  instagram text default '',
  address_fr text default '',
  address_ar text default '',
  hours_fr text default '',
  hours_ar text default ''
);
insert into settings (id) values (1) on conflict do nothing;

alter table products enable row level security;
alter table colors enable row level security;
alter table orders enable row level security;
alter table settings enable row level security;

-- Public: read catalogue + settings, and place orders
create policy "public read products" on products for select using (true);
create policy "public read colors" on colors for select using (true);
create policy "public read settings" on settings for select using (true);
create policy "public insert orders" on orders for insert to anon, authenticated with check (true);

-- Admin (any signed-in user — keep sign-ups disabled and create only the admin user)
create policy "admin all products" on products for all to authenticated using (true) with check (true);
create policy "admin all colors" on colors for all to authenticated using (true) with check (true);
create policy "admin all settings" on settings for all to authenticated using (true) with check (true);
create policy "admin read orders" on orders for select to authenticated using (true);
create policy "admin update orders" on orders for update to authenticated using (true) with check (true);
create policy "admin delete orders" on orders for delete to authenticated using (true);

-- Product images bucket
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict do nothing;
create policy "public read images" on storage.objects for select using (bucket_id = 'product-images');
create policy "admin upload images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
create policy "admin update images" on storage.objects for update to authenticated using (bucket_id = 'product-images');
create policy "admin delete images" on storage.objects for delete to authenticated using (bucket_id = 'product-images');

-- Optional sample data
with p as (
  insert into products (name_fr, name_ar, desc_fr, desc_ar, bucket_kg, coverage_m2_per_kg, base_price, sort_order)
  values
  ('Époxy Sol Brillant', 'إيبوكسي أرضيات لامع', 'Revêtement de sol époxy brillant, haute résistance, idéal pour garages, ateliers et locaux commerciaux.', 'طلاء أرضيات إيبوكسي لامع عالي المقاومة، مثالي للمرائب والورشات والمحلات التجارية.', 20, 0.4, 28000, 1),
  ('Époxy Autolissant 3D', 'إيبوكسي ذاتي التسوية 3D', 'Finition lisse et continue, parfaite pour showrooms, salons et espaces design.', 'تشطيب أملس ومتواصل، مثالي لصالات العرض والصالونات والمساحات العصرية.', 25, 0.25, 42000, 2)
  returning id, name_fr
)
insert into colors (product_id, name_fr, name_ar, hex, price, sort_order)
select p.id, c.n_fr, c.n_ar, c.hex, c.price, c.so from p
join (values
  ('Époxy Sol Brillant','Gris Béton','رمادي إسمنتي','#9aa0a6',28000,1),
  ('Époxy Sol Brillant','Noir','أسود','#161616',29500,2),
  ('Époxy Sol Brillant','Orange Purepox','برتقالي بيوربوكس','#ec6b14',31000,3),
  ('Époxy Sol Brillant','Blanc','أبيض','#f4f4f4',28000,4),
  ('Époxy Autolissant 3D','Gris Perle','رمادي لؤلؤي','#c9ccd1',45000,1),
  ('Époxy Autolissant 3D','Anthracite','أنثراسيت','#3a3d42',46500,2),
  ('Époxy Autolissant 3D','Beige Sable','بيج رملي','#d8c3a5',45000,3)
) as c(pname, n_fr, n_ar, hex, price, so) on c.pname = p.name_fr;
