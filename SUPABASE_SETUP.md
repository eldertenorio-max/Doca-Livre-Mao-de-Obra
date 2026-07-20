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
No serviço static, defina as mesmas variáveis de ambiente. O build roda:

`node scripts/write-supabase-config.mjs && npm run build`

gerando `public/supabase-config.json` para o runtime.

## 5. E-mail OTP (produção)
Hoje o código é exibido na tela quando não há SMTP (igual ao modo debug do WMS). Para produção, configure Edge Function + provedor (Resend/SendGrid) para enviar o código e remova `debug_codigo` da resposta.
