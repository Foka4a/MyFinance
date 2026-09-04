import { SkeletonCard } from '../components/Skeleton.jsx'

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Dashboard</h1>
      <SkeletonCard />
    </div>
  )
}
