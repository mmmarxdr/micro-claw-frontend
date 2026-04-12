import { useState, useEffect, type ReactNode } from 'react'
import { getAuthToken, setAuthToken, api, AuthError } from '../api/client'
import { KeyRound } from 'lucide-react'

interface AuthGateProps {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const [authed, setAuthed] = useState<boolean | null>(null) // null = checking
  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  // On mount, check if stored token is still valid.
  useEffect(() => {
    const stored = getAuthToken()
    if (!stored) {
      setAuthed(false)
      return
    }
    api.status()
      .then(() => setAuthed(true))
      .catch((err) => {
        if (err instanceof AuthError) {
          setAuthed(false)
        } else {
          // Network error or server down — assume token is fine, let app handle it.
          setAuthed(true)
        }
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = token.trim()
    if (!trimmed) return

    setAuthToken(trimmed)
    try {
      await api.status()
      setAuthed(true)
      setError('')
    } catch (err) {
      if (err instanceof AuthError) {
        setError('Invalid token')
        setAuthToken('') // clear bad token
      } else {
        // Server might be down — save token anyway.
        setAuthed(true)
      }
    }
  }

  // Loading state.
  if (authed === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-neutral-500 text-sm">Connecting...</div>
      </div>
    )
  }

  // Authenticated — render app.
  if (authed) return <>{children}</>

  // Token prompt.
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800">
            <KeyRound className="w-5 h-5 text-neutral-400" />
          </div>
          <h1 className="text-lg font-semibold text-white">microagent</h1>
          <p className="text-sm text-neutral-500">
            Enter the auth token shown in the server console.
          </p>
        </div>

        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Auth token"
          autoFocus
          className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 font-mono"
        />

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <button
          type="submit"
          className="w-full py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors"
        >
          Connect
        </button>

        <p className="text-xs text-neutral-600 text-center">
          Token is printed to the console when the server starts.
        </p>
      </form>
    </div>
  )
}
