insert into public.business_categories (id, name, description)
values
  ('11111111-1111-1111-1111-111111111111', 'Food', 'Meals, snacks, and catering'),
  ('22222222-2222-2222-2222-222222222222', 'Fashion', 'Clothing, tailoring, and accessories'),
  ('33333333-3333-3333-3333-333333333333', 'Beauty', 'Hair, makeup, and self-care'),
  ('44444444-4444-4444-4444-444444444444', 'Services', 'Repairs, logistics, and general services')
on conflict (id) do nothing;

insert into public.profiles (id, full_name, phone_number, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Admin User', '+2348000000000', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Amina Musa', '+2348011111111', 'vendor'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'John Bako', '+2348022222222', 'vendor')
on conflict (id) do nothing;

insert into public.businesses (
  id,
  category_id,
  business_name,
  owner_name,
  phone_number,
  whatsapp_phone,
  location_area,
  delivery_available,
  products_services,
  status,
  is_verified,
  is_active,
  created_by
)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    'Amina Cakes',
    'Amina Musa',
    '+2348011111111',
    '+2348011111111',
    'Tunga',
    true,
    'Birthday cakes, small chops, dessert cups',
    'approved',
    true,
    true,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '44444444-4444-4444-4444-444444444444',
    'Bako Repairs',
    'John Bako',
    '+2348022222222',
    '+2348022222222',
    'Bosso',
    false,
    'Generator repairs, home visits',
    'approved',
    true,
    true,
    'cccccccc-cccc-cccc-cccc-cccccccccccc'
  )
on conflict (id) do nothing;

insert into public.business_memberships (business_id, user_id, role)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'owner')
on conflict (business_id, user_id) do nothing;

insert into public.products (id, business_id, name, unit_price, is_active)
values
  ('f1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Small Birthday Cake', 15000, true),
  ('f2222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dessert Cup', 2500, true),
  ('f3333333-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Generator Service', 12000, true)
on conflict (id) do nothing;

insert into public.customers (id, business_id, full_name, phone_number)
values
  ('c1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Mary Yusuf', '+2348033333333'),
  ('c2222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Ibrahim Aliyu', '+2348044444444')
on conflict (id) do nothing;

insert into public.transactions (
  id,
  business_id,
  customer_id,
  recorded_by,
  transaction_date,
  subtotal_amount,
  total_amount,
  amount_paid,
  amount_pending,
  payment_status,
  payment_method,
  notes
)
values
  (
    't1111111-1111-1111-1111-111111111111',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'c1111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    timezone('utc', now()) - interval '2 hours',
    15000,
    15000,
    15000,
    0,
    'paid',
    'transfer',
    'Birthday order'
  ),
  (
    't2222222-2222-2222-2222-222222222222',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'c2222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    timezone('utc', now()) - interval '1 hour',
    5000,
    5000,
    2000,
    3000,
    'partial',
    'cash',
    'Two dessert cups pending balance'
  )
on conflict (id) do nothing;

insert into public.transaction_items (
  transaction_id,
  product_id,
  item_name,
  quantity,
  unit_price,
  line_total
)
values
  ('t1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'Small Birthday Cake', 1, 15000, 15000),
  ('t2222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222', 'Dessert Cup', 2, 2500, 5000);

insert into public.payments (
  transaction_id,
  business_id,
  customer_id,
  amount,
  payment_method,
  recorded_by
)
values
  ('t1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'c1111111-1111-1111-1111-111111111111', 15000, 'transfer', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('t2222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'c2222222-2222-2222-2222-222222222222', 2000, 'cash', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

insert into public.enquiries (category_id, customer_name, customer_phone, location_area, requested_item, details, status, matched_business_ids)
values
  ('11111111-1111-1111-1111-111111111111', 'Halima', '+2348055555555', 'Tunga', 'Cake', 'Need a cake for Friday', 'matched', array['dddddddd-dddd-dddd-dddd-dddddddddddd']::uuid[]);
