# MyFinance Dark — spec extraída do Claude Design

Fonte: https://claude.ai/design/p/939b0149-3adb-4795-9159-fd6fadec0dff (arquivo `MyFinance Dark.dc.html`).
Extraída em 2026-09-09 direto do arquivo do projeto de design. `support.js` é o runtime do canvas
do Claude Design (sem conteúdo de produto) — ignorar.

Tipografia: **IBM Plex Sans** (UI) + **IBM Plex Mono** (todo valor monetário / datas / eixos).

## Tokens (`:root`) — OKLCH

```css
:root{
  --bg:oklch(0.16 0.011 258);
  --surface:oklch(0.205 0.013 258);
  --surface2:oklch(0.245 0.014 258);
  --line:oklch(0.30 0.015 258);
  --ink:oklch(0.97 0.004 258);
  --muted:oklch(0.71 0.012 258);
  --faint:oklch(0.56 0.012 258);
  --pos:oklch(0.78 0.15 158);
  --neg:oklch(0.71 0.17 22);
  --pos-soft:oklch(0.30 0.06 158);
  --neg-soft:oklch(0.30 0.06 22);
  --accent:oklch(0.72 0.15 275);
  --c1:oklch(0.72 0.15 275);
  --c2:oklch(0.74 0.13 195);
  --c3:oklch(0.78 0.14 75);
  --c4:oklch(0.71 0.16 22);
  --c5:oklch(0.76 0.14 158);
  --c6:oklch(0.72 0.13 320);
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg)}
a{color:var(--accent);text-decoration:none}
a:hover{color:oklch(0.82 0.13 275)}
[data-hide-money="true"] [data-money]{filter:blur(8px);user-select:none}
input,select,textarea,button{font-family:inherit}
```

Note o `[data-hide-money]` — modo "Ocultar valores" (blur em tudo marcado com `data-money`).

---

## 1. Card Saldo Atual + gráfico de linha com degradê

Card em gradiente, raio 18px. Sparkline SVG à direita, `viewBox="0 0 400 90"`,
`preserveAspectRatio="none"`, altura fixa 90px, com area fill em `linearGradient`
(0.35 → 0 de opacidade) na mesma cor da linha, stroke 2.5, ponto final `<circle r="4">`.
Legenda de datas embaixo (início / meio / fim do período) em Mono 11px `--faint`.

A cor do sparkline no design é a verde `oklch(0.78 0.15 158)` (= `--pos`), casando com
o badge de variação positiva. Para variação negativa o par é `--neg` / `--neg-soft`.

```html
<section style="background:linear-gradient(160deg,var(--surface2),var(--surface) 60%);border:1px solid var(--line);border-radius:18px;padding:26px 28px;display:flex;flex-wrap:wrap;gap:28px;align-items:center;justify-content:space-between">
  <div style="min-width:260px">
    <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--faint)">Saldo atual · todas as contas</div>
    <div style="display:flex;align-items:baseline;gap:14px;margin-top:10px;flex-wrap:wrap">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:46px;font-weight:600;letter-spacing:-0.03em;line-height:1" data-money>R$ 4.950,00</div>
      <div style="display:flex;align-items:center;gap:6px;background:var(--pos-soft);color:var(--pos);font-size:12.5px;font-weight:600;padding:5px 10px;border-radius:999px" data-money>▲ 12,4% vs. agosto</div>
    </div>
    <div style="font-size:13px;color:var(--muted);margin-top:12px">Variação comparada com 02/08 – 31/08/2026.</div>
  </div>
  <div style="flex:1;min-width:220px;max-width:420px">
    <svg viewBox="0 0 400 90" preserveAspectRatio="none" style="width:100%;height:90px;display:block">
      <defs>
        <linearGradient id="mfSpark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="oklch(0.78 0.15 158)" stop-opacity="0.35" />
          <stop offset="100%" stop-color="oklch(0.78 0.15 158)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 78 L40 74 L80 66 L120 69 L160 55 L200 58 L240 42 L280 36 L320 40 L360 22 L400 12 L400 90 L0 90 Z" fill="url(#mfSpark)" />
      <path d="M0 78 L40 74 L80 66 L120 69 L160 55 L200 58 L240 42 L280 36 L320 40 L360 22 L400 12" fill="none" stroke="oklch(0.78 0.15 158)" stroke-width="2.5" stroke-linejoin="round" />
      <circle cx="400" cy="12" r="4" fill="oklch(0.78 0.15 158)" />
    </svg>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--faint);font-family:'IBM Plex Mono',monospace;margin-top:4px"><span>01/09</span><span>15/09</span><span>30/09</span></div>
  </div>
</section>
```

---

## 2. Barra de registro rápido

Section própria logo abaixo do card de saldo. Raio 14px, padding 14x16, `flex-wrap` com gap 10px.
**Não há seletor de Tipo (entrada/saída) no design** — só descrição, valor, chips de categoria e
"Adicionar". Os chips são `<span>` pill com borda; no design são estáticos (sem estado de seleção
marcado no markup) e o hover é `color:var(--ink); border-color:var(--faint)`.

```html
<section style="background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center">
  <span style="font-size:12px;color:var(--faint);letter-spacing:0.06em;text-transform:uppercase;padding-right:4px">Registro rápido</span>
  <input placeholder="Mercado, aluguel, aula particular..." style="flex:1;min-width:180px;background:var(--surface2);border:1px solid var(--line);color:var(--ink);font-size:13.5px;padding:10px 12px;border-radius:9px;outline:none" />
  <input placeholder="R$ 0,00" style="width:120px;background:var(--surface2);border:1px solid var(--line);color:var(--ink);font-family:'IBM Plex Mono',monospace;font-size:13.5px;padding:10px 12px;border-radius:9px;outline:none" />
  <div style="display:flex;gap:6px">
    <span style="font-size:12.5px;border:1px solid var(--line);border-radius:999px;padding:7px 12px;color:var(--muted);cursor:pointer">Alimentação</span>
    <span style="...idem...">Transporte</span>
    <span style="...idem...">Moradia</span>
  </div>
  <button style="border:1px solid var(--line);background:var(--surface2);color:var(--ink);font-size:13px;font-weight:600;padding:10px 16px;border-radius:9px;cursor:pointer">Adicionar</button>
</section>
```

Hover do botão: `border-color:var(--accent); color:var(--accent)`.

---

## 3. Barra de limites do mês

Última section do Dashboard. Cabeçalho "Limites do mês" + contador "faltam N dias".
Grid `auto-fit minmax(240px,1fr)` gap 20px — **um item por categoria com limite**, cada um com:
linha nome + `gasto / limite` em Mono, barra de 7px, e uma frase de status colorida.

Estados observados no design (a cor da barra e da frase mudam com o consumo):
- **Dentro do previsto** (63%): barra `--c2`, frase em `--muted` — "63% usado — dentro do previsto"
- **Atenção** (89%): barra `--c3`, frase em `--c3` — "89% usado — no ritmo atual estoura em 3 dias"
- **Estourado** (107%): barra `--neg` travada em `width:100%`, frase em `--neg` — "107% usado — R$ 20,00 acima do limite"

```html
<section style="background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:20px">
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px">
    <h2 style="margin:0;font-size:14px;font-weight:600">Limites do mês</h2>
    <span style="font-size:12px;color:var(--faint)">faltam 25 dias</span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px">
    <div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span>Alimentação</span><span style="font-family:'IBM Plex Mono',monospace;color:var(--muted)" data-money>890 / 1.000</span></div>
      <div style="height:7px;border-radius:999px;background:var(--surface2);overflow:hidden"><div style="width:89%;height:100%;background:var(--c3)"></div></div>
      <div style="font-size:11.5px;color:var(--c3);margin-top:7px">89% usado — no ritmo atual estoura em 3 dias</div>
    </div>
    <!-- Transporte: 380 / 600, width:63%, barra --c2, texto --muted -->
    <!-- Lazer:      320 / 300, width:100%, barra --neg, texto --neg -->
  </div>
</section>
```

---

## Contexto extra do design (não pedido em melhorias.md, mas visível)

- Header do Dashboard tem toggles: `Semana | Mês | 90 dias`, `Ocultar valores`, `Modo claro`, e botão `Novo lançamento` em `--accent`.
- Card "Cobertura" na sidebar: "1,4 mês — Seu saldo cobre a média de gastos por esse tempo".
- Rodapé da sidebar: "Tudo fica neste computador. Nenhum banco conectado."
- O `.dc.html` usa `<sc-if value="{{ isFluxo }}">` para alternar telas — construto do canvas, não do app.
