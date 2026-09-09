// Renderiza as quatro telas fora do browser e falha se alguma estourar.
// Existe por causa de um bug real: chartTheme.js mexia em
// Chart.defaults.plugins.tooltip antes do register(Tooltip), o modulo estourava
// no import e a pagina inteira ficava em branco — build e lint passavam iguais.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const webDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = '.render-test';

// Chama o bin do vite pelo node em vez de npx: no Windows o Node se recusa a
// dar spawn em .cmd sem shell.
execFileSync(
  process.execPath,
  [
    join(webDir, 'node_modules', 'vite', 'bin', 'vite.js'),
    'build',
    '--ssr',
    'test/renderEntry.jsx',
    '--outDir',
    outDir,
    '--logLevel',
    'error',
  ],
  { cwd: webDir, stdio: 'inherit' }
);

try {
  const { render } = await import(`file://${join(webDir, outDir, 'renderEntry.js').replace(/\\/g, '/')}`);

  for (const path of ['/', '/fluxo', '/lancamentos', '/contas', '/dashboard']) {
    const html = render(path);
    assert.ok(html.length > 500, `${path} renderizou vazio`);
    assert.ok(html.includes('MyFinance'), `${path} nao renderizou o layout`);
  }
} finally {
  rmSync(join(webDir, outDir), { recursive: true, force: true });
}

console.log('render.test.mjs: as quatro telas renderizaram');
