create extension if not exists "pgcrypto";

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null unique,
  email text not null unique,
  phone text,
  role text not null default 'funcionario' check (role in ('admin', 'funcionario')),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_records (
  id uuid primary key default gen_random_uuid(),
  module text not null check (module in ('dashboard', 'conversas', 'leads', 'projetos', 'disparos', 'recorrentes', 'notificar', 'financeiro', 'agentes', 'equipe', 'configuracoes')),
  title text not null default '',
  status text,
  owner_user_id uuid references public.app_users(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_records_module_idx on public.crm_records(module);
create index if not exists crm_records_owner_user_id_idx on public.crm_records(owner_user_id);
create index if not exists crm_records_data_gin_idx on public.crm_records using gin(data);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_users_updated_at on public.app_users;
create trigger app_users_updated_at before update on public.app_users for each row execute function public.set_updated_at();

drop trigger if exists crm_records_updated_at on public.crm_records;
create trigger crm_records_updated_at before update on public.crm_records for each row execute function public.set_updated_at();

alter table public.app_users enable row level security;
alter table public.crm_records enable row level security;

drop policy if exists "app_users_service_role_all" on public.app_users;
create policy "app_users_service_role_all" on public.app_users for all to service_role using (true) with check (true);

drop policy if exists "crm_records_service_role_all" on public.crm_records;
create policy "crm_records_service_role_all" on public.crm_records for all to service_role using (true) with check (true);

insert into public.app_users (name, username, email, role, status, password_hash)
values (
  'Administrador',
  'root',
  'root@peraxis.local',
  'admin',
  'ativo',
  crypt('roots2601', gen_salt('bf'))
)
on conflict (username) do update set
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

insert into public.crm_records (module, title, status, data)
values
  ('leads', 'Marina Costa', 'proposta', '{"nome":"Marina Costa","telefone":"5511978140022","email":"marina@empresa.com","cpfCnpj":"12.345.678/0001-90","origem":"chatbot","valor":1290}'::jsonb),
  ('projetos', 'Implantacao WhatsApp Oficial', 'em_andamento', '{"cliente":"Marina Costa","prioridade":"alta","prazo":"2026-07-18"}'::jsonb),
  ('financeiro', 'Plano Pro Marina', 'entrada', '{"tipo":"entrada","categoria":"Mensalidade","valor":1290,"formaPagamento":"Pix"}'::jsonb),
  ('disparos', 'Boas-vindas Junho', 'template', '{"total":1200,"enviado":1180,"entregue":1144,"lido":872,"falha":20}'::jsonb),
  ('recorrentes', 'Marina Costa', 'ativo', '{"cliente":"Marina Costa","telefone":"5511978140022","plano":"Pro","mensalidade":1290,"valorAPagar":1290,"vencimento":"2026-07-10"}'::jsonb),
  ('notificar', 'Juliana Prado', 'atrasado', '{"cliente":"Juliana Prado","telefone":"5521988887777","valor":890,"vencimento":"2026-06-28","mensagem":"Identificamos uma mensalidade em atraso."}'::jsonb),
  ('configuracoes', 'Empresa', 'ativo', '{"nome":"Peraxis Desenvolvimento e Automacoes","dominio":"peraxis.vercel.app"}'::jsonb)
on conflict do nothing;
