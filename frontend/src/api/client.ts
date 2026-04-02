import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor for logging
client.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor for error normalization
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const raw = error.response?.data?.error
    const errorStr =
      typeof raw === 'string' ? raw :
      raw && typeof raw === 'object' ? (raw.detail ?? raw.message ?? JSON.stringify(raw)) :
      null
    const message =
      error.response?.data?.message ||
      errorStr ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(String(message)))
  },
)

export default client
