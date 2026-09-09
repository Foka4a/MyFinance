import { Chart as ChartJS, Tooltip } from 'chart.js'

// Precisa registrar antes de mexer em defaults.plugins.tooltip: o Chart.js so
// cria essa chave quando o plugin entra no registry, e ate la ela e undefined.
// Todos os graficos usam tooltip, entao o registro mora aqui.
ChartJS.register(Tooltip)

// Um lugar so pra cor e forma dos graficos, senao cada arquivo de chart vira
// uma paleta paralela. Os hex sao os tokens oklch do index.css convertidos —
// o parser de cor do Chart.js nao le oklch, entao aqui e hex mesmo.
export const C = {
  bg: '#0a0d12',
  surface: '#14171d',
  surface2: '#1c2127',
  ink: '#f3f5f8',
  ink3: '#70757c',
  line: '#292e35',
  lineSoft: '#21262c',
  azul: '#8a9bff',
  azulFill: 'rgb(138 155 255 / 0.30)',
  jade: '#50d492',
  vinho: '#f96f70',
}

ChartJS.defaults.font.family = "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif"
ChartJS.defaults.font.size = 11
ChartJS.defaults.color = C.ink3
ChartJS.defaults.maintainAspectRatio = false
ChartJS.defaults.animation.duration = 600
ChartJS.defaults.animation.easing = 'easeOutCubic'

// Tooltip escuro sobre fundo escuro precisa de borda pra nao derreter no card.
Object.assign(ChartJS.defaults.plugins.tooltip, {
  backgroundColor: C.surface2,
  borderColor: C.line,
  borderWidth: 1,
  titleColor: C.ink,
  bodyColor: C.ink,
  padding: 10,
  cornerRadius: 8,
  boxPadding: 5,
  titleFont: { weight: '600' },
  bodyFont: { weight: '500', family: "'IBM Plex Mono', ui-monospace, monospace" },
})

if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  ChartJS.defaults.animation.duration = 0
}

// Eixo Y: grade horizontal fina, sem a barra da borda. A linha do zero fica
// mais clara porque cruzar o zero e informacao, nao decoracao.
export const axisY = (formatTick) => ({
  border: { display: false },
  grid: {
    drawTicks: false,
    color: (ctx) => (ctx.tick?.value === 0 ? C.line : C.lineSoft),
  },
  ticks: {
    // Valores em reais: sem precision o Chart.js cria ticks fracionarios (0,2 / 0,4)
    // que o formatador arredonda pro mesmo rotulo repetido quando tudo e zero.
    precision: 0,
    padding: 10,
    callback: formatTick,
    font: { family: "'IBM Plex Mono', ui-monospace, monospace", size: 10.5 },
  },
})

export const axisX = {
  border: { color: C.line },
  grid: { display: false },
  ticks: {
    padding: 8,
    maxRotation: 0,
    autoSkipPadding: 16,
    font: { family: "'IBM Plex Mono', ui-monospace, monospace", size: 10.5 },
  },
}
