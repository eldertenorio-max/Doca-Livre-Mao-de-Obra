# Supabase — Doca Livre Mão de Obra

## 1. Criar projeto
1. Acesse https://supabase.com e crie um projeto (ex.: `doca-livre-mao-de-obra`).
2. Em **Project Settings → API**, copie:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`

## 2. SQL
No **SQL Editor**, execute o arquivo:

`supabase/sql/bootstrap_mao_de_obra.sql`

Isso cria tabelas de usuários, OTP (`mao_email_codigos`), permissões e hierarquia, e seed dos superusuários **Diego** e **Elder**.

## 3. Local
Crie `.env` na raiz:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Sem essas variáveis o app roda em modo local (localStorage + código OTP na tela).

> **Nota (Windows/IPv6):** o host `db.<ref>.supabase.co` pode falhar por IPv6.
> Use o pooler da região do projeto, ex.:
> `postgresql://postgres.<ref>:[SENHA]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres`

## 4. Render
O serviço é Node (`node server/index.mjs`): ele publica a pasta `dist` e envia o código de acesso. Defina as mesmas variáveis do Supabase e também `RESEND_API_KEY` e `RESEND_FROM` (as mesmas do WMS Pro). O build roda:

`node scripts/write-supabase-config.mjs && npm run build`

gerando `public/supabase-config.json` para o runtime.

## 5. E-mail OTP
O código de cadastro e de troca de senha sai por e-mail (Resend), no mesmo formato do WMS Pro. A tela só pede para abrir a caixa de entrada. Sem `RESEND_API_KEY` o envio falha e o código não aparece na tela. `onboarding@resend.dev` só entrega para o dono da conta Resend; use `RESEND_FROM` de um domínio verificado para chegar em qualquer e-mail.
