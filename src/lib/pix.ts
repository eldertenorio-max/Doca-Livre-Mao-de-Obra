export type TipoPix = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'

export type PixConferido = {
  tipo: TipoPix
  chave: string
  rotulo: string
}

const DDD = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
])

function soDigitos(valor: string) {
  return valor.replace(/\D/g, '')
}

function cpfValido(digitos: string) {
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false
  const n = [...digitos].map(Number)
  let soma = 0
  for (let i = 0; i < 9; i += 1) soma += n[i] * (10 - i)
  let digito = (soma * 10) % 11
  if (digito === 10) digito = 0
  if (digito !== n[9]) return false
  soma = 0
  for (let i = 0; i < 10; i += 1) soma += n[i] * (11 - i)
  digito = (soma * 10) % 11
  if (digito === 10) digito = 0
  return digito === n[10]
}

function cnpjValido(digitos: string) {
  if (digitos.length !== 14 || /^(\d)\1{13}$/.test(digitos)) return false
  const n = [...digitos].map(Number)
  const peso1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const peso2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let soma = 0
  for (let i = 0; i < 12; i += 1) soma += n[i] * peso1[i]
  let digito = soma % 11
  digito = digito < 2 ? 0 : 11 - digito
  if (digito !== n[12]) return false
  soma = 0
  for (let i = 0; i < 13; i += 1) soma += n[i] * peso2[i]
  digito = soma % 11
  digito = digito < 2 ? 0 : 11 - digito
  return digito === n[13]
}

function formatarCpf(digitos: string) {
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
}

function formatarCnpj(digitos: string) {
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`
}

function telefoneCanonico(digitos: string) {
  let nacional = digitos
  if (nacional.startsWith('55') && (nacional.length === 12 || nacional.length === 13)) {
    nacional = nacional.slice(2)
  }
  if (nacional.length !== 10 && nacional.length !== 11) return null
  const ddd = nacional.slice(0, 2)
  const numero = nacional.slice(2)
  if (!DDD.has(ddd)) return null
  if (numero.length === 9 && !numero.startsWith('9')) return null
  if (numero.length === 8 && !/^[2-5]/.test(numero)) return null
  const formatado =
    numero.length === 9
      ? `+55 ${ddd} ${numero.slice(0, 5)}-${numero.slice(5)}`
      : `+55 ${ddd} ${numero.slice(0, 4)}-${numero.slice(4)}`
  return formatado
}

function emailValido(valor: string) {
  const email = valor.trim().toLowerCase()
  if (email.length < 6 || email.length > 77) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

export function validarChavePix(
  entrada: string,
): { ok: true } & PixConferido | { ok: false; erro: string } {
  const texto = entrada.trim()
  if (!texto) return { ok: false, erro: 'Informe a chave PIX.' }

  if (texto.includes('@')) {
    const email = emailValido(texto)
    if (!email) return { ok: false, erro: 'E-mail inválido. Confira a chave PIX.' }
    return { ok: true, tipo: 'email', chave: email, rotulo: 'E-mail' }
  }

  const semEspaco = texto.replace(/\s/g, '')
  if (semEspaco.includes('-') && /[a-f]/i.test(semEspaco)) {
    const aleatoria = semEspaco.toLowerCase()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(aleatoria)) {
      return { ok: false, erro: 'Chave aleatória inválida. Ela tem o formato de um código com traços.' }
    }
    return { ok: true, tipo: 'aleatoria', chave: aleatoria, rotulo: 'Chave aleatória' }
  }

  const digitos = soDigitos(texto)
  const pareceTelefone = texto.startsWith('+') || /[()]/.test(texto)
  const pareceCpf = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(semEspaco)
  const pareceCnpj = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(semEspaco)

  if (pareceCnpj || digitos.length === 14) {
    if (!cnpjValido(digitos)) return { ok: false, erro: 'CNPJ inválido. Confira os números da chave.' }
    return { ok: true, tipo: 'cnpj', chave: formatarCnpj(digitos), rotulo: 'CNPJ' }
  }

  if (pareceCpf || (digitos.length === 11 && cpfValido(digitos) && !pareceTelefone)) {
    if (!cpfValido(digitos)) return { ok: false, erro: 'CPF inválido. Confira os números da chave.' }
    return { ok: true, tipo: 'cpf', chave: formatarCpf(digitos), rotulo: 'CPF' }
  }

  const telefone = telefoneCanonico(digitos)
  if (telefone && (pareceTelefone || digitos.length === 10 || digitos.length === 11 || digitos.length === 12 || digitos.length === 13)) {
    return { ok: true, tipo: 'telefone', chave: telefone, rotulo: 'Celular' }
  }

  if (digitos.length === 11) return { ok: false, erro: 'CPF inválido. Confira os números da chave.' }
  return { ok: false, erro: 'Use um CPF, CNPJ, e-mail, celular com DDD ou chave aleatória.' }
}
