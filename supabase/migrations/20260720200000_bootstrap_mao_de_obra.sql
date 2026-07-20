-- Doca Livre Mão de Obra — bootstrap Supabase
-- Execute no SQL Editor do projeto Supabase (ordem única deste arquivo).

-- Usuários do portal
create table if not exists mao_usuarios (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique,
  email text not null unique,
  senha_hash text not null,
  role text not null check (role in ('empresa', 'profissional', 'admin', 'super')),
  perfil_id text,
  nivel_hierarquia text not null default 'operador'
    check (nivel_hierarquia in ('super', 'gestor', 'operador')),
  superior_usuario text,
  empresa_org_id text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists mao_usuarios_email_idx on mao_usuarios (lower(email));
create index if not exists mao_usuarios_superior_idx on mao_usuarios (superior_usuario);

-- OTP e-mail (cadastro / troca de senha)
create table if not exists mao_email_codigos (
  id uuid primary key default gen_random_uuid(),
  finalidade text not null check (finalidade in ('cadastro', 'senha')),
  email text not null,
  codigo_hash text not null,
  expira_em timestamptz not null,
  usado boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists mao_email_codigos_email_idx on mao_email_codigos (lower(email), finalidade);

alter table mao_email_codigos enable row level security;

-- Permissões por sistema (empresa | profissional | admin)
create table if not exists mao_permissoes (
  id uuid primary key default gen_random_uuid(),
  usuario text not null references mao_usuarios (usuario) on delete cascade,
  sistema text not null check (sistema in ('empresa', 'profissional', 'admin')),
  pode_acessar boolean not null default true,
  modulos jsonb,
  unique (usuario, sistema)
);

-- Níveis de hierarquia
create table if not exists mao_hierarquia_niveis (
  id text primary key,
  label text not null,
  ordem int not null
);

insert into mao_hierarquia_niveis (id, label, ordem) values
  ('super', 'Superusuário', 1),
  ('gestor', 'Gestor', 2),
  ('operador', 'Operador', 3)
on conflict (id) do nothing;

-- Árvore organizacional
create table if not exists mao_org_nos (
  id uuid primary key default gen_random_uuid(),
  sistema text not null default 'empresa',
  tipo text not null,
  nome text not null,
  parent_id uuid references mao_org_nos (id) on delete set null,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Grupos de hierarquia
create table if not exists mao_grupos_hierarquia (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sistema text not null default 'empresa',
  created_at timestamptz not null default now()
);

create table if not exists mao_grupos_hierarquia_membros (
  grupo_id uuid not null references mao_grupos_hierarquia (id) on delete cascade,
  usuario text not null,
  primary key (grupo_id, usuario)
);

-- Snapshot operacional (opcional — sync futuro do app)
create table if not exists mao_app_state (
  id text primary key default 'main',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Seed superusuários (senha inicial: demo123 — TROCAR em produção)
-- Hash SHA-256 de "demo123" + pepper doca-mao (mesmo do client local)
-- Para demo, o app local também cria Diego/Elder; no Supabase use Edge Function para hash seguro.

insert into mao_usuarios (usuario, email, senha_hash, role, nivel_hierarquia, ativo)
values
  ('Diego', 'diego@docalivre.com', 'local:demo123', 'super', 'super', true),
  ('Elder', 'elder@docalivre.com', 'local:demo123', 'super', 'super', true)
on conflict (usuario) do update set
  role = excluded.role,
  nivel_hierarquia = excluded.nivel_hierarquia,
  ativo = true;

insert into mao_permissoes (usuario, sistema, pode_acessar, modulos)
values
  ('Diego', 'empresa', true, null),
  ('Diego', 'profissional', true, null),
  ('Diego', 'admin', true, null),
  ('Elder', 'empresa', true, null),
  ('Elder', 'profissional', true, null),
  ('Elder', 'admin', true, null)
on conflict (usuario, sistema) do update set pode_acessar = true, modulos = null;

-- RLS permissivo para MVP (restrinja depois com service role / Edge Functions)
alter table mao_usuarios enable row level security;
alter table mao_permissoes enable row level security;
alter table mao_org_nos enable row level security;
alter table mao_grupos_hierarquia enable row level security;
alter table mao_grupos_hierarquia_membros enable row level security;
alter table mao_app_state enable row level security;

do $$ begin
  create policy mao_usuarios_all on mao_usuarios for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy mao_permissoes_all on mao_permissoes for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy mao_org_all on mao_org_nos for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy mao_grupos_all on mao_grupos_hierarquia for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy mao_grupos_membros_all on mao_grupos_hierarquia_membros for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy mao_app_state_all on mao_app_state for all using (true) with check (true);
exception when duplicate_object then null; end $$;
