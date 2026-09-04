const BASE = '/api'

export async function api(path, options = {}) {
  const { body, headers, ...rest } = options

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body != null && typeof body === 'object' ? JSON.stringify(body) : body,
  })

  if (res.status === 204) return null

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(json?.error ?? 'Erro inesperado')
  }

  return json
}

export const get = (path) => api(path)
export const post = (path, body) => api(path, { method: 'POST', body })
export const put = (path, body) => api(path, { method: 'PUT', body })
export const del = (path) => api(path, { method: 'DELETE' })
