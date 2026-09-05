# MyFinance

Dashboard local de finanças pessoais. Sem conexão com bancos ou instituições
financeiras — todos os dados ficam num arquivo SQLite na própria máquina.

## Requisitos

- Node.js >= 20

## Como rodar

Precisa de dois terminais abertos ao mesmo tempo.

**Terminal 1 — backend (porta 3001):**

```
cd server
npm install
npm run dev
```

**Terminal 2 — frontend (porta 5173):**

```
cd web
npm install
npm run dev
```

O frontend já tem proxy configurado de `/api` para `http://localhost:3001`,
então basta abrir `http://localhost:5173`.

No primeiro boot do backend, o banco é criado e populado com dados de
exemplo automaticamente, em `server/data/myfinance.db`.

## Testes

```
cd server && npm test
```
Sobe a API contra um banco SQLite temporário e testa rotas (contas,
categorias, lançamentos) e cálculos de resumo/fluxo de caixa/patrimônio.

```
cd web && npm test
```
Testa funções puras de formatação (moeda, data) e montagem de query string
de lançamentos.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `server/src/routes` | Rotas da API (contas, categorias, lançamentos, resumo, fluxo de caixa, investimentos/patrimônio) |
| `server/src/schema.sql` | Schema do banco SQLite |
| `server/src/db.js` | Conexão, criação e seed automática do banco |
| `web/src/pages` | Telas (dashboard, fluxo de caixa, lançamentos, contas/investimentos) |
| `web/src/components` | Componentes de UI reutilizáveis |
| `web/src/lib` | Funções puras (formatação, montagem de queries) |
| `web/src/hooks` | Hooks de acesso a dados da API |

## Decisões

- Dinheiro é sempre armazenado em centavos inteiros, nunca float.
- Datas são guardadas como TEXT no formato `YYYY-MM-DD`.
- Saldo de conta de investimento vem do snapshot mais recente; as demais
  contas somam lançamentos até hoje (data futura não entra no saldo atual).
- Sem autenticação — aplicação local, de um usuário só.
- Sem transferência entre contas e sem lançamento recorrente (fora do
  escopo da spec).

## Backup

O banco é um arquivo único: copiar `server/data/myfinance.db` já é o backup.
