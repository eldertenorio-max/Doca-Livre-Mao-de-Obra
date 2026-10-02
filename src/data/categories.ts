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
      { id: 'motorista_van', label: 'Motorista de van', requisitos: ['CNH'] },
      { id: 'motorista_entrega', label: 'Motorista de entrega', requisitos: ['CNH'] },
      { id: 'motorista_cnh_d', label: 'Motorista CNH D', requisitos: ['CNH'] },
      { id: 'motorista_cnh_e', label: 'Motorista CNH E', requisitos: ['CNH'] },
      { id: 'manobrista', label: 'Manobrista', requisitos: ['CNH'] },
      { id: 'ajudante_rota', label: 'Ajudante de rota' },
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
      { id: 'repositor', label: 'Repositor' },
      { id: 'auxiliar_expedicao', label: 'Auxiliar de expedição' },
      { id: 'auxiliar_recebimento', label: 'Auxiliar de recebimento' },
      { id: 'operador_coletor', label: 'Operador de coletor' },
      { id: 'conferente_nf', label: 'Conferente de nota fiscal' },
      { id: 'encarregado_armazem', label: 'Encarregado de armazém' },
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
      { id: 'empilhadeira_retratil', label: 'Empilhadeira retrátil', requisitos: ['NR11'] },
      { id: 'transpaleteira', label: 'Transpaleteira', requisitos: ['NR11'] },
      { id: 'operador_doca', label: 'Operador de doca' },
      { id: 'amarrador', label: 'Amarrador de carga' },
      { id: 'sinaleiro', label: 'Sinaleiro' },
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
      { id: 'mecanico_empilhadeira', label: 'Mecânico de empilhadeira' },
      { id: 'auxiliar_manutencao', label: 'Auxiliar de manutenção' },
      { id: 'funileiro', label: 'Funileiro' },
      { id: 'lubrificador', label: 'Lubrificador' },
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
      { id: 'assistente_administrativo', label: 'Assistente administrativo' },
      { id: 'auxiliar_administrativo', label: 'Auxiliar administrativo' },
      { id: 'analista_logistica', label: 'Analista de logística' },
      { id: 'faturista', label: 'Faturista' },
      { id: 'programador_cargas', label: 'Programador de cargas' },
      { id: 'assistente_rh', label: 'Assistente de RH' },
      { id: 'recepcionista', label: 'Recepcionista' },
    ],
  },
  {
    id: 'limpeza',
    label: 'Limpeza e apoio',
    cargos: [
      { id: 'auxiliar_limpeza', label: 'Auxiliar de limpeza' },
      { id: 'servicos_gerais', label: 'Auxiliar de serviços gerais' },
      { id: 'copeira', label: 'Copeira' },
    ],
  },
  {
    id: 'seguranca',
    label: 'Segurança',
    cargos: [
      { id: 'vigilante', label: 'Vigilante' },
      { id: 'porteiro', label: 'Porteiro' },
      { id: 'controlador_acesso', label: 'Controlador de acesso' },
    ],
  },
  {
    id: 'producao',
    label: 'Produção',
    cargos: [
      { id: 'auxiliar_producao', label: 'Auxiliar de produção' },
      { id: 'operador_producao', label: 'Operador de produção' },
      { id: 'operador_maquina', label: 'Operador de máquina' },
      { id: 'montador', label: 'Montador' },
      { id: 'inspetor_qualidade', label: 'Inspetor de qualidade' },
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
