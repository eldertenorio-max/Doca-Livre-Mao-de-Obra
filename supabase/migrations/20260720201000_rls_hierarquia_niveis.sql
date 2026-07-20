-- Habilita RLS em mao_hierarquia_niveis (faltou no bootstrap)
alter table public.mao_hierarquia_niveis enable row level security;

do $$ begin
  create policy mao_hierarquia_niveis_all
    on public.mao_hierarquia_niveis
    for all
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;
