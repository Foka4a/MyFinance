import express from 'express';
import { pathToFileURL } from 'node:url';
import { accountsRouter } from './routes/accounts.js';
import { categoriesRouter } from './routes/categories.js';
import { transactionsRouter } from './routes/transactions.js';

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/accounts', accountsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status === 500) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
    return;
  }
  res.status(status).json({ error: err.message });
});

const PORT = process.env.PORT || 3001;

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(PORT, () => {
    console.log(`MyFinance API rodando na porta ${PORT}`);
  });
}

export { app };
