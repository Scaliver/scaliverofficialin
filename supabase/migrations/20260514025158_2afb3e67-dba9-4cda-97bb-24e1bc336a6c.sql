create extension if not exists pg_cron;
create extension if not exists pg_net;

create unique index if not exists orders_payment_request_id_unique_idx
on public.orders (payment_request_id)
where payment_request_id is not null;