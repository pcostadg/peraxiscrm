create extension if not exists "pgcrypto";

create type public.lead_status as enum ('novo', 'contato', 'negociacao', 'ganho', 'perdido');
create type public.project_status as enum ('planejado', 'em_andamento', 'pausado', 'concluido');
create type public.finance_type as enum ('receita', 'despesa');
create type public.conversation_status as enum ('aberta', 'aguardando', 'finalizada');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'admin' check (role in ('admin', 'funcionario')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 2 and 120),
  email text,
  phone text,
  company text,
  status public.lead_status not null default 'novo',
  value numeric(14,2) not null default 0 check (value >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  lead_id uuid references public.leads(id) on delete set null,
  name text not null check (char_length(name) between 2 and 160),
  description text,
  status public.project_status not null default 'planejado',
  due_date date,
  budget numeric(14,2) not null default 0 check (budget >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  project_id uuid references public.projects(id) on delete set null,
  description text not null check (char_length(description) between 2 and 180),
  type public.finance_type not null,
  category text,
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null default current_date,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  lead_id uuid references public.leads(id) on delete set null,
  name text not null,
  phone text not null,
  wa_id text,
  created_at timestamptz not null default now(),
  unique(user_id, phone)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  status public.conversation_status not null default 'aberta',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  meta_message_id text unique,
  direction text not null check (direction in ('entrada', 'saida')),
  content text not null,
  status text not null default 'pendente',
  created_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  template_name text,
  status text not null default 'rascunho' check (status in ('rascunho', 'agendada', 'enviando', 'concluida', 'cancelada')),
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  instructions text not null default '',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'meta',
  event_type text,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index leads_user_id_idx on public.leads(user_id);
create index projects_user_id_idx on public.projects(user_id);
create index finance_entries_user_id_idx on public.finance_entries(user_id);
create index contacts_user_id_idx on public.contacts(user_id);
create index conversations_user_id_idx on public.conversations(user_id);
create index messages_user_id_idx on public.messages(user_id);
create index campaigns_user_id_idx on public.campaigns(user_id);
create index agents_user_id_idx on public.agents(user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger finance_entries_updated_at before update on public.finance_entries for each row execute function public.set_updated_at();
create trigger agents_updated_at before update on public.agents for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)));
  return new;
end;
$$;

insert into public.profiles (id, name)
select id, coalesce(raw_user_meta_data ->> 'name', split_part(coalesce(email, ''), '@', 1))
from auth.users
on conflict (id) do nothing;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.projects enable row level security;
alter table public.finance_entries enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.campaigns enable row level security;
alter table public.agents enable row level security;
alter table public.webhook_events enable row level security;

create policy "profiles_own" on public.profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "leads_own" on public.leads for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "projects_own" on public.projects for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "finance_own" on public.finance_entries for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "contacts_own" on public.contacts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "conversations_own" on public.conversations for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "messages_own" on public.messages for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "campaigns_own" on public.campaigns for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "agents_own" on public.agents for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on all tables in schema public to authenticated;
