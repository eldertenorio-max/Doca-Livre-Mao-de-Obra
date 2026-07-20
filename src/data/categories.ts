export type CategoryGroup = {
  id: string
  label: string
  cargos: { id: string; label: string; requisitos?: string[] }[]
}

export const CATEGORIES: CategoryGroup[] = [
  {
    id: 'transporte',
    label: 'Transporte',
    cargos: [
      { id: 'motorista_cnh_b', label: 'Motorista CNH B', requisitos: ['CNH'] },
      { id: 'motorista_vuc', label: 'Motorista VUC', requisitos: ['CNH'] },
      { id: 'motorista_toco', label: 'Motorista Toco', requisitos: ['CNH'] },
      { id: 'motorista_truck', label: 'Motorista Truck', requisitos: ['CNH'] },
      { id: 'carreteiro', label: 'Carreta', requisitos: ['CNH'] },
      { id: 'bitrem', label: 'Bitrem', requisitos: ['CNH'] },
      { id: 'rodotrem', label: 'Rodotrem', requisitos: ['CNH'] },
      { id: 'mopp', label: 'Motorista MOPP', requisitos: ['CNH', 'MOPP'] },
      { id: 'munck', label: 'Operador de Munck', requisitos: ['CNH', 'Munck'] },
    ],
  },
  {
    id: 'armazem',
    label: 'Armazém',
    cargos: [
      { id: 'auxiliar_logistica', label: 'Auxiliar de logística' },
      { id: 'conferente', label: 'Conferente' },
      { id: 'separador', label: 'Separador (Picker)' },
      { id: 'estoquista', label: 'Estoquista' },
      { id: 'expedidor', label: 'Expedidor' },
      { id: 'recebimento', label: 'Recebimento' },
      { id: 'inventarista', label: 'Inventarista' },
    ],
  },
  {
    id: 'operacao',
    label: 'Operação / Equipamentos',
    cargos: [
      { id: 'empilhadeira', label: 'Operador de empilhadeira', requisitos: ['NR11'] },
      { id: 'paleteira', label: 'Paleteira elétrica', requisitos: ['NR11'] },
      { id: 'ponte_rolante', label: 'Ponte rolante', requisitos: ['Ponte Rolante'] },
      { id: 'guindaste', label: 'Guindaste' },
      { id: 'reach_stacker', label: 'Reach Stacker' },
      { id: 'ajudante_carga', label: 'Ajudante de carga e descarga' },
      { id: 'embalador', label: 'Embalador' },
    ],
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    cargos: [
      { id: 'mecanico_diesel', label: 'Mecânico Diesel' },
      { id: 'eletricista', label: 'Eletricista automotivo', requisitos: ['NR10'] },
      { id: 'soldador', label: 'Soldador' },
      { id: 'borracheiro', label: 'Borracheiro' },
      { id: 'lavador_frota', label: 'Lavador de frota' },
    ],
  },
  {
    id: 'administrativo',
    label: 'Administrativo',
    cargos: [
      { id: 'analista_transporte', label: 'Analista de Transporte' },
      { id: 'torre_controle', label: 'Torre de Controle' },
      { id: 'monitor_frota', label: 'Monitor de Frota' },
      { id: 'controlador_patio', label: 'Controlador de Pátio' },
    ],
  },
]

export function allCargos() {
  return CATEGORIES.flatMap((c) =>
    c.cargos.map((cargo) => ({ ...cargo, categoria: c.id, categoriaLabel: c.label })),
  )
}

export function cargoLabel(id: string) {
  return allCargos().find((c) => c.id === id)?.label ?? id
}

export function cargoCategoria(id: string) {
  return allCargos().find((c) => c.id === id)?.categoria ?? ''
}
