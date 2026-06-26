alter table public.products
add column if not exists stock_quantity numeric(12,2);

comment on column public.products.stock_quantity is
'Optional stock count for products. Leave null when stock is not tracked.';
