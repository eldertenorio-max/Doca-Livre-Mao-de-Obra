# Deploy — Doca Livre Mão de Obra

Ordem: **Supabase → GitHub → Render**.

Repo: https://github.com/eldertenorio-max/Doca-Livre-M-o-de-Obra

## Render (passo a passo)

1. Abra https://dashboard.render.com e faça login.
2. **New +** → **Blueprint**.
3. Conecte o GitHub (se ainda não) e selecione **`eldertenorio-max/Doca-Livre-M-o-de-Obra`**.
4. Render lê o `render.yaml` e cria o static site **`doca-livre-mao-de-obra`**.
5. Preencha as variáveis (obrigatórias):

| Key | Value |
|-----|--------|
| `VITE_SUPABASE_URL` | `https://wsympxaarlrfdasmpbyf.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | a publishable key do projeto (Dashboard Supabase → Settings → API) |
| `NODE_VERSION` | `20.19.0` (já vem no blueprint) |

6. **Apply** / **Deploy**.
7. Aguarde o build (`npm ci` → `write-supabase-config` → `vite build`).
8. Abra a URL `*.onrender.com` gerada.

### Alternativa sem Blueprint
**New +** → **Static Site** → mesmo repo → branch `main`:

- **Build:** `npm ci --no-audit --no-fund && node scripts/write-supabase-config.mjs && npm run build`
- **Publish:** `dist`
- **Rewrite:** `/*` → `/index.html`
- Mesmas env vars acima

## Após o deploy
- Login Empresa / Profissional / Admin na URL do Render
- Demo: `carlos` / `demo123` (profissional), `logexpress` / `demo123` (empresa)
- Super: `Diego` ou `Elder` / `demo123` (só no **Admin**)

## SMTP (depois)
Enquanto não houver e-mail, o código OTP aparece na tela (modo debug).
