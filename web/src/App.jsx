import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import FluxoCaixa from './pages/FluxoCaixa.jsx'
import Lancamentos from './pages/Lancamentos.jsx'
import Contas from './pages/Contas.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/fluxo" element={<FluxoCaixa />} />
        <Route path="/lancamentos" element={<Lancamentos />} />
        <Route path="/contas" element={<Contas />} />
        {/* ponytail: qualquer rota desconhecida cai no dashboard em vez de tela branca */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
