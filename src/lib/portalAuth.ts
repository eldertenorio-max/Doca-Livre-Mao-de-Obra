import { getSupabase } from './supabaseClient'
import { isLocalSuperUser } from './portalPermissoes'

const OTP_KEY = 'mao-portal-otp-v1'
const TOKEN_TTL_MS = 15 * 60 * 1000
const CODE_TTL_MS = 10 * 60 * 1000

type OtpRecord = {
  finalidade: 'cadastro' | 'senha'
  email: string
  codigo: string
  expiraEm: number
  usado: boolean
  verifyToken?: string
  tokenExpira?: number
  portalRole?: 'empresa' | 'profissional'
}

type OtpStore = { records: OtpRecord[] }

function loadOtp(): OtpStore {
  try {
    const raw = localStorage.getItem(OTP_KEY)
    if (!raw) return { records: [] }
    return JSON.parse(raw) as OtpStore
  } catch {
    return { records: [] }
  }
}

function saveOtp(store: OtpStore) {
  localStorage.setItem(OTP_KEY, JSON.stringify(store))
}

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function genToken() {
  return `vt_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

async function trySupabaseInsertCodigo(email: string, finalidade: string, codigo: string) {
  const sb = await getSupabase()
  if (!sb) return
  const expira = new Date(Date.now() + CODE_TTL_MS).toISOString()
  await sb.from('mao_email_codigos').insert({
    finalidade,
    email: normalizeEmail(email),
    codigo_hash: `local:${codigo}`,
    expira_em: expira,
    usado: false,
  })
}

export type PortalRole = 'empresa' | 'profissional'

export async function portalCadastroEnviarCodigo(
  email: string,
  portalRole: PortalRole,
): Promise<{ ok: true; mensagem: string; debug_codigo?: string } | { ok: false; erro: string }> {
  const em = normalizeEmail(email)
  if (!em || !em.includes('@')) return { ok: false, erro: 'Informe um e-mail válido.' }

  const codigo = genCode()
  const store = loadOtp()
  store.records = store.records.filter(
    (r) => !(r.finalidade === 'cadastro' && r.email === em && !r.usado),
  )
  store.records.push({
    finalidade: 'cadastro',
    email: em,
    codigo,
    expiraEm: Date.now() + CODE_TTL_MS,
    usado: false,
    portalRole,
  })
  saveOtp(store)
  void trySupabaseInsertCodigo(em, 'cadastro', codigo)

  // Sem SMTP configurado: exibe código (mesmo padrão do WMS Pro em debug).
  return {
    ok: true,
    mensagem: `Código enviado para ${em}. (Ambiente sem SMTP: use o código abaixo.)`,
    debug_codigo: codigo,
  }
}

export async function portalCadastroVerificarCodigo(
  email: string,
  codigo: string,
): Promise<{ ok: true; verify_token: string; mensagem: string } | { ok: false; erro: string }> {
  const em = normalizeEmail(email)
  const store = loadOtp()
  const rec = store.records.find(
    (r) =>
      r.finalidade === 'cadastro' &&
      r.email === em &&
      !r.usado &&
      r.codigo === codigo.trim() &&
      r.expiraEm > Date.now(),
  )
  if (!rec) return { ok: false, erro: 'Código inválido ou expirado.' }
  const token = genToken()
  rec.verifyToken = token
  rec.tokenExpira = Date.now() + TOKEN_TTL_MS
  saveOtp(store)
  return { ok: true, verify_token: token, mensagem: 'E-mail confirmado. Defina usuário e senha.' }
}

export function portalPeekCadastroToken(verifyToken: string): {
  email: string
  portalRole: PortalRole
} | null {
  const store = loadOtp()
  const rec = store.records.find(
    (r) =>
      r.finalidade === 'cadastro' &&
      r.verifyToken === verifyToken &&
      (r.tokenExpira ?? 0) > Date.now() &&
      !r.usado,
  )
  if (!rec || !rec.portalRole) return null
  return { email: rec.email, portalRole: rec.portalRole }
}

export function portalConsumeCadastroToken(verifyToken: string): boolean {
  const store = loadOtp()
  const rec = store.records.find((r) => r.verifyToken === verifyToken)
  if (!rec || (rec.tokenExpira ?? 0) <= Date.now()) return false
  rec.usado = true
  saveOtp(store)
  return true
}

export async function portalSenhaEnviarCodigo(
  identificador: string,
  resolveEmail: (id: string) => string | null,
): Promise<{ ok: true; mensagem: string; debug_codigo?: string; email: string } | { ok: false; erro: string }> {
  const email = resolveEmail(identificador.trim())
  if (!email) return { ok: false, erro: 'Usuário ou e-mail não encontrado.' }
  const em = normalizeEmail(email)
  const codigo = genCode()
  const store = loadOtp()
  store.records = store.records.filter(
    (r) => !(r.finalidade === 'senha' && r.email === em && !r.usado),
  )
  store.records.push({
    finalidade: 'senha',
    email: em,
    codigo,
    expiraEm: Date.now() + CODE_TTL_MS,
    usado: false,
  })
  saveOtp(store)
  void trySupabaseInsertCodigo(em, 'senha', codigo)
  return {
    ok: true,
    email: em,
    mensagem: `Código enviado para ${em}. (Ambiente sem SMTP: use o código abaixo.)`,
    debug_codigo: codigo,
  }
}

export async function portalSenhaVerificarCodigo(
  email: string,
  codigo: string,
): Promise<{ ok: true; verify_token: string; mensagem: string } | { ok: false; erro: string }> {
  const em = normalizeEmail(email)
  const store = loadOtp()
  const rec = store.records.find(
    (r) =>
      r.finalidade === 'senha' &&
      r.email === em &&
      !r.usado &&
      r.codigo === codigo.trim() &&
      r.expiraEm > Date.now(),
  )
  if (!rec) return { ok: false, erro: 'Código inválido ou expirado.' }
  const token = genToken()
  rec.verifyToken = token
  rec.tokenExpira = Date.now() + TOKEN_TTL_MS
  saveOtp(store)
  return { ok: true, verify_token: token, mensagem: 'Código confirmado. Defina a nova senha.' }
}

export function portalPeekSenhaToken(verifyToken: string): string | null {
  const store = loadOtp()
  const rec = store.records.find(
    (r) =>
      r.finalidade === 'senha' &&
      r.verifyToken === verifyToken &&
      (r.tokenExpira ?? 0) > Date.now() &&
      !r.usado,
  )
  return rec?.email ?? null
}

export function portalConsumeSenhaToken(verifyToken: string): boolean {
  const store = loadOtp()
  const rec = store.records.find((r) => r.verifyToken === verifyToken)
  if (!rec || (rec.tokenExpira ?? 0) <= Date.now()) return false
  rec.usado = true
  saveOtp(store)
  return true
}

export { isLocalSuperUser }
