import { cargoLabel } from '../../data/categories'
import { useStore } from '../../lib/store'
import type { Nivel } from '../../lib/types'

type Fatia = { rotulo: string; valor: number; cor: string }

const CORES = {
  amarelo: '#f9db00',
  azul: '#2d76c4',
  verde: '#16a34a',
  navy: '#1a2b4a',
  cinza: '#94a3b8',
  vermelho: '#dc2626',
  laranja: '#d97706',
}

export function AdminDashboard() {
  const { state } = useStore()
  const abertas = state.demandas.filter((d) => d.status === 'aberta').length
  const andamento = state.demandas.filter((d) => d.status === 'em_andamento').length
  const finalizadas = state.demandas.filter((d) => d.status === 'finalizada').length
  const canceladas = state.demandas.filter((d) => d.status === 'cancelada').length
  const volume = state.pagamentos.reduce((s, p) => s + p.valor, 0)
  const comissao = state.pagamentos.reduce((s, p) => s + p.comissao, 0)
  const pendProf = state.profissionais.filter((p) => p.status === 'pendente').length
  const pendEmp = state.empresas.filter((e) => e.status === 'pendente').length
  const avaliacoesEmpresa = state.avaliacoes.filter((item) => item.deRole === 'empresa').length

  const porCidade = agrupar(
    state.profissionais.map((pessoa) => pessoa.endereco.cidade || 'Sem cidade'),
  )
  const porCargo = agrupar(state.demandas.map((demanda) => cargoLabel(demanda.cargo))).slice(0, 6)

  const vagas: Fatia[] = [
    { rotulo: 'Abertas', valor: abertas, cor: CORES.azul },
    { rotulo: 'Em andamento', valor: andamento, cor: CORES.amarelo },
    { rotulo: 'Finalizadas', valor: finalizadas, cor: CORES.verde },
    { rotulo: 'Canceladas', valor: canceladas, cor: CORES.cinza },
  ]
  const candidaturas: Fatia[] = [
    { rotulo: 'Pendentes', valor: contar(state.candidaturas, 'pendente'), cor: CORES.laranja },
    { rotulo: 'Aceitas', valor: contar(state.candidaturas, 'aceita'), cor: CORES.azul },
    { rotulo: 'Confirmadas', valor: contar(state.candidaturas, 'confirmada'), cor: CORES.verde },
    { rotulo: 'Recusadas', valor: contar(state.candidaturas, 'recusada'), cor: CORES.vermelho },
    { rotulo: 'Canceladas', valor: contar(state.candidaturas, 'cancelada'), cor: CORES.cinza },
  ]
  const niveis: Fatia[] = (['bronze', 'prata', 'ouro', 'elite'] as Nivel[]).map((nivel) => ({
    rotulo: nivel.charAt(0).toUpperCase() + nivel.slice(1),
    valor: state.profissionais.filter((pessoa) => pessoa.nivel === nivel).length,
    cor: nivel === 'elite' ? CORES.navy : nivel === 'ouro' ? CORES.amarelo : nivel === 'prata' ? CORES.cinza : '#b45309',
  }))
  const empresas: Fatia[] = [
    { rotulo: 'Aprovadas', valor: state.empresas.filter((e) => e.status === 'aprovada').length, cor: CORES.verde },
    { rotulo: 'Aguardando', valor: pendEmp, cor: CORES.laranja },
    { rotulo: 'Bloqueadas', valor: state.empresas.filter((e) => e.status === 'bloqueada').length, cor: CORES.vermelho },
  ]

  return (
    <div className="px-page ad-dash">
      <h1 className="px-title">Dashboard</h1>
      <p className="ad-lead">Empresas, profissionais, vagas, candidaturas e o que ainda espera aprovação.</p>

      <div className="ad-kpis">
        <Cartao rotulo="Empresas" valor={String(state.empresas.length)} detalhe={`${pendEmp} aguardando`} />
        <Cartao rotulo="Profissionais" valor={String(state.profissionais.length)} detalhe={`${pendProf} aguardando`} />
        <Cartao rotulo="Vagas abertas" valor={String(abertas)} detalhe={`${state.demandas.length} no total`} />
        <Cartao rotulo="Candidaturas" valor={String(state.candidaturas.length)} detalhe={`${contar(state.candidaturas, 'confirmada')} confirmadas`} />
        <Cartao rotulo="Volume das diárias" valor={moeda(volume)} detalhe={`${state.pagamentos.length} pagamentos`} />
        <Cartao rotulo="Comissões" valor={moeda(comissao)} detalhe={`${avaliacoesEmpresa} avaliações de empresa`} />
      </div>

      <div className="ad-grade">
        <section className="px-card">
          <h3>Vagas</h3>
          <GraficoRosca itens={vagas} />
        </section>
        <section className="px-card">
          <h3>Candidaturas</h3>
          <GraficoBarras itens={candidaturas} />
        </section>
        <section className="px-card">
          <h3>Profissionais por cidade</h3>
          <GraficoBarras itens={porCidade.map((item, indice) => ({ ...item, cor: indice % 2 === 0 ? CORES.azul : CORES.navy }))} />
        </section>
        <section className="px-card">
          <h3>Classificação</h3>
          <p className="ad-nota">A medalha sobe com a média das avaliações da empresa.</p>
          <GraficoBarras itens={niveis} />
        </section>
        <section className="px-card">
          <h3>Empresas</h3>
          <GraficoRosca itens={empresas} />
        </section>
        <section className="px-card">
          <h3>Vagas por cargo</h3>
          <GraficoBarras itens={porCargo.map((item) => ({ ...item, cor: CORES.amarelo }))} />
        </section>
      </div>
    </div>
  )
}

function Cartao({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <article className="ad-kpi">
      <span>{rotulo}</span>
      <strong>{valor}</strong>
      <small>{detalhe}</small>
    </article>
  )
}

function GraficoBarras({ itens }: { itens: Fatia[] }) {
  const maximo = Math.max(1, ...itens.map((item) => item.valor))
  if (!itens.length) return <p className="ad-vazio">Nada para mostrar ainda.</p>
  return (
    <ul className="ad-barras">
      {itens.map((item) => (
        <li key={item.rotulo}>
          <span>{item.rotulo}</span>
          <span className="ad-trilho" aria-hidden>
            <span style={{ width: `${(item.valor / maximo) * 100}%`, background: item.cor }} />
          </span>
          <strong>{item.valor}</strong>
        </li>
      ))}
    </ul>
  )
}

function GraficoRosca({ itens }: { itens: Fatia[] }) {
  const total = itens.reduce((soma, item) => soma + item.valor, 0)
  const raio = 46
  const volta = 2 * Math.PI * raio
  let percorrido = 0
  const descricao = itens.map((item) => `${item.rotulo}: ${item.valor}`).join(', ')

  return (
    <div className="ad-rosca">
      <svg viewBox="0 0 140 140" role="img" aria-label={descricao}>
        <circle cx="70" cy="70" r={raio} fill="none" stroke="#e8eef5" strokeWidth="16" />
        {total > 0 &&
          itens.map((item) => {
            const fatia = (item.valor / total) * volta
            const circulo = (
              <circle
                key={item.rotulo}
                cx="70"
                cy="70"
                r={raio}
                fill="none"
                stroke={item.cor}
                strokeWidth="16"
                strokeDasharray={`${Math.max(fatia - 1.2, 0)} ${volta}`}
                strokeDashoffset={-percorrido}
                transform="rotate(-90 70 70)"
              />
            )
            percorrido += fatia
            return item.valor > 0 ? circulo : null
          })}
        <text x="70" y="68" textAnchor="middle" className="ad-rosca-num">
          {total}
        </text>
        <text x="70" y="86" textAnchor="middle" className="ad-rosca-leg">
          total
        </text>
      </svg>
      <ul className="ad-legenda">
        {itens.map((item) => (
          <li key={item.rotulo}>
            <i style={{ background: item.cor }} />
            <span>{item.rotulo}</span>
            <strong>{item.valor}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

function agrupar(nomes: string[]): Fatia[] {
  const mapa = new Map<string, number>()
  for (const nome of nomes) mapa.set(nome, (mapa.get(nome) ?? 0) + 1)
  return [...mapa.entries()]
    .map(([rotulo, valor]) => ({ rotulo, valor, cor: CORES.azul }))
    .sort((a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
}

function contar(lista: { status: string }[], status: string) {
  return lista.filter((item) => item.status === status).length
}

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
