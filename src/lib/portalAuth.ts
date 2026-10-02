import { isLocalSuperUser } from './portalPermissoes'

const OTP_KEY = 'mao-portal-otp-v1'
const TOKEN_TTL_MS = 15 * 60 * 1000
const CODE_TTL_MS = 10 * 60 * 1000
const COOLDOWN_MS = 60 * 1000

type OtpRecord = {
  finalidade: 'cadastro' | 'senha'
  email: string
  codigo: string
  expiraEm: number
  criadoEm: number
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

function emEspera(store: OtpStore, finalidade: OtpRecord['finalidade'], email: string) {
  const recente = store.records.find(
    (item) =>
      item.finalidade === finalidade &&
      item.email === email &&
      !item.usado &&
      Date.now() - (item.criadoEm || 0) < COOLDOWN_MS,
  )
  return Boolean(recente)
}

async function enviarCodigoPorEmail(email: string, codigo: string, finalidade: OtpRecord['finalidade']) {
  try {
    const resposta = await fetch('/api/portal/enviar-codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, codigo, finalidade }),
    })
    const texto = await resposta.text()
    let data: { ok?: boolean; erro?: string } = {}
    try {
      data = JSON.parse(texto) as { ok?: boolean; erro?: string }
    } catch {
      return { ok: false as const, erro: 'Não foi possível enviar o e-mail. Tente de novo em instantes.' }
    }
    if (!resposta.ok || !data.ok) {
      return { ok: false as const, erro: data.erro || 'Não foi possível enviar o e-mail.' }
    }
    return { ok: true as const }
  } catch {
    return { ok: false as const, erro: 'Não foi possível enviar o e-mail. Tente de novo em instantes.' }
  }
}

export type PortalRole = 'empresa' | 'profissional'

export async function portalCadastroEnviarCodigo(
  email: string,
  portalRole: PortalRole,
): Promise<{ ok: true; mensagem: string } | { ok: false; erro: string }> {
  const em = normalizeEmail(email)
  if (!em || !em.includes('@')) return { ok: false, erro: 'Informe um e-mail válido.' }

  const store = loadOtp()
  if (emEspera(store, 'cadastro', em)) {
    return { ok: false, erro: 'Aguarde cerca de 1 minuto para pedir outro código.' }
  }
  const codigo = genCode()
  const enviado = await enviarCodigoPorEmail(em, codigo, 'cadastro')
  if (!enviado.ok) return enviado

  store.records = store.records.filter((item) => !(item.finalidade === 'cadastro' && item.email === em && !item.usado))
  store.records.push({
    finalidade: 'cadastro',
    email: em,
    codigo,
    expiraEm: Date.now() + CODE_TTL_MS,
    criadoEm: Date.now(),
    usado: false,
    portalRole,
  })
  saveOtp(store)

  return {
    ok: true,
    mensagem: 'Código enviado. Confira sua caixa de entrada.',
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
): Promise<{ ok: true; mensagem: string; email: string } | { ok: false; erro: string }> {
  const email = resolveEmail(identificador.trim())
  if (!email) return { ok: false, erro: 'Usuário ou e-mail não encontrado.' }
  const em = normalizeEmail(email)
  const store = loadOtp()
  if (emEspera(store, 'senha', em)) {
    return { ok: false, erro: 'Aguarde cerca de 1 minuto para pedir outro código.' }
  }
  const codigo = genCode()
  const enviado = await enviarCodigoPorEmail(em, codigo, 'senha')
  if (!enviado.ok) return enviado
  store.records = store.records.filter((item) => !(item.finalidade === 'senha' && item.email === em && !item.usado))
  store.records.push({
    finalidade: 'senha',
    email: em,
    codigo,
    expiraEm: Date.now() + CODE_TTL_MS,
    criadoEm: Date.now(),
    usado: false,
  })
  saveOtp(store)
  return {
    ok: true,
    email: em,
    mensagem: 'Código enviado. Confira sua caixa de entrada.',
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
