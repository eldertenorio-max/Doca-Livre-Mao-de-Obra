# Deploy — Doca Livre Mão de Obra

Ordem: **Supabase → GitHub → Render**.

Repo: https://github.com/eldertenorio-max/Doca-Livre-M-o-de-Obra

## Render (passo a passo)

1. Abra https://dashboard.render.com e faça login.
2. **New +** → **Blueprint**.
3. Conecte o GitHub (se ainda não) e selecione **`eldertenorio-max/Doca-Livre-M-o-de-Obra`**.
4. Render lê o `render.yaml` e cria o serviço Node **`doca-livre-mao-de-obra`** (`node server/index.mjs`).
5. Preencha as variáveis (obrigatórias):

| Key | Value |
|-----|--------|
| `VITE_SUPABASE_URL` | `https://wsympxaarlrfdasmpbyf.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | a publishable key do projeto (Dashboard Supabase → Settings → API) |
| `NODE_VERSION` | `20.19.0` (já vem no blueprint) |
| `RESEND_API_KEY` | a mesma chave do WMS Pro |
| `RESEND_FROM` | remetente verificado, a mesma do WMS Pro |
| `GEMINI_API_KEY` | a mesma chave Gemini do WMS Plus, só no servidor |

6. **Apply** / **Deploy**.
7. Aguarde o build (`npm ci` → `write-supabase-config` → `vite build`) e o start `node server/index.mjs`.
8. Abra a URL `*.onrender.com` gerada.

### Alternativa sem Blueprint
**New +** → **Web Service** → mesmo repo → branch `main` → runtime Node:

- **Build:** `npm ci --no-audit --no-fund && node scripts/write-supabase-config.mjs && npm run build`
- **Start:** `node server/index.mjs`
- Mesmas env vars acima

## Após o deploy
- Login Empresa / Profissional / Admin na URL do Render
- Demo: `carlos` / `demo123` (profissional), `logexpress` / `demo123` (empresa)
- Super: `Diego` ou `Elder` / `demo123` (só no **Admin**)

## E-mail do código
O site publicado é estático e chama a função Supabase `enviar-codigo`. No projeto **Doca Livre Mão de Obra**, em Edge Functions → Secrets, defina `RESEND_API_KEY` e `RESEND_FROM` (as mesmas do WMS Pro). Sem a chave, a tela avisa que o envio ainda não está configurado. `onboarding@resend.dev` só chega no dono da conta Resend; use um remetente de domínio verificado. No computador, o Vite também aceita `POST /api/portal/enviar-codigo`.
