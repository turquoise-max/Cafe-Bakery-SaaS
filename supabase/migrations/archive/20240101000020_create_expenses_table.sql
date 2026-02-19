create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  expense_date date not null,
  category varchar(50) not null,
  amount decimal(10,2) not null,
  description text,
  created_at timestamp default now()
);

-- RLS Policies
alter table expenses enable row level security;

create policy "Users can view their store expenses"
  on expenses for select
  using (
    store_id in (
      select store_id from user_roles
      where user_id = auth.uid()
    )
  );

create policy "Users can insert their store expenses"
  on expenses for insert
  with check (
    store_id in (
      select store_id from user_roles
      where user_id = auth.uid()
      and role in ('owner', 'manager')
    )
  );

create policy "Users can update their store expenses"
  on expenses for update
  using (
    store_id in (
      select store_id from user_roles
      where user_id = auth.uid()
      and role in ('owner', 'manager')
    )
  );

create policy "Users can delete their store expenses"
  on expenses for delete
  using (
    store_id in (
      select store_id from user_roles
      where user_id = auth.uid()
      and role in ('owner', 'manager')
    )
  );