import { useCallback, useEffect, useState } from 'react'
import { get } from '../lib/api.js'

export function useApi(path, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    get(path)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, error, reload }
}
