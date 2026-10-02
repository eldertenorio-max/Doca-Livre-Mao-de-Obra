const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function dataDe(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  if (!ano || !mes || !dia) return null
  const data = new Date(ano, mes - 1, dia)
  if (Number.isNaN(data.getTime())) return null
  return data
}

function dataCurta(data: Date, comAno: boolean) {
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const semana = SEMANA[data.getDay()].slice(0, 3)
  return comAno ? `${semana}, ${dia}/${mes}/${data.getFullYear()}` : `${semana}, ${dia}/${mes}`
}

export function rotuloPeriodo(inicio: string, fim?: string) {
  const a = dataDe(inicio)
  if (!a) return inicio
  const fimIso = fim && fim !== inicio ? fim : inicio
  const b = dataDe(fimIso) ?? a
  const dias = Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1)
  const diasTxt = dias === 1 ? '1 dia' : `${dias} dias`
  if (dias === 1) return `${dataCurta(a, true)} · ${diasTxt}`
  const mesmoAno = a.getFullYear() === b.getFullYear()
  return `${dataCurta(a, !mesmoAno)} a ${dataCurta(b, true)} · ${diasTxt}`
}

export function formatarDistancia(km: number) {
  if (!Number.isFinite(km) || km < 0) return 'Não calculada'
  if (km < 1) {
    const metros = Math.max(1, Math.round(km * 1000))
    return `${metros.toLocaleString('pt-BR')} m`
  }
  return `${km.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`
}
