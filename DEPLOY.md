# Deploy — Doca Livre Mão de Obra

Ordem recomendada: **Supabase → GitHub → Render → login/SMTP**.

## 1. Supabase
Siga `SUPABASE_SETUP.md` (SQL + `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).

## 2. GitHub
```bash
git init
git add .
git commit -m "Initial commit: Doca Livre Mão de Obra"
gh auth login
gh repo create doca-livre-mao-de-obra --private --source=. --remote=origin --push
```

## 3. Render
1. New → Blueprint → selecione o repositório (usa `render.yaml`).
2. Ou Static Site: build `npm ci && node scripts/write-supabase-config.mjs && npm run build`, publish `dist`.
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Login
- Tela inicial: **Empresa** | **Profissional** | Admin
- Cadastro / esqueci senha: código de 6 dígitos por e-mail (em local o código aparece na tela)
- Superusuários: **Diego** e **Elder** / senha `demo123` — acesso total + tela de hierarquia/permissões
- Demo empresa: `logexpress` / `demo123` ou `empresa@logexpress.com`
- Demo profissional: `carlos` / `demo123`
