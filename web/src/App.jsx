import { Routes, Route } from 'react-router-dom'
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
      </Routes>
    </Layout>
  )
}
