'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('demo@northwind.ai')
  const [password, setPassword] = useState('demo-password')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createSupabaseBrowserClient()
      const result = mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

      if (result.error) throw result.error
      router.push('/dashboard')
      router.refresh()
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  async function signInWithProvider(provider: 'google' | 'github') {
    setLoading(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { error: providerError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (providerError) {
      setError(providerError.message)
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6 inline-flex rounded-lg border border-border bg-secondary/50 p-1">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={
            'rounded-md px-4 py-1.5 text-sm font-medium transition-colors ' +
            (mode === 'signin'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground')
          }
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={
            'rounded-md px-4 py-1.5 text-sm font-medium transition-colors ' +
            (mode === 'signup'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground')
          }
        >
          Create account
        </button>
      </div>

      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        {mode === 'signin' ? 'Welcome back' : 'Create your workspace'}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {mode === 'signin'
          ? 'Sign in to continue testing your agents.'
          : 'Start with 500 free adversarial scenarios per month.'}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === 'signup' && (
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              placeholder="Northwind AI"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {mode === 'signin' && (
              <a href="#" className="text-xs text-purple hover:underline">
                Forgot password?
              </a>
            )}
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {mode === 'signin' ? 'Signing in…' : 'Creating…'}
            </>
          ) : (
            <>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or continue with</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" onClick={() => signInWithProvider('google')} disabled={loading}>
          Google
        </Button>
        <Button variant="outline" size="lg" onClick={() => signInWithProvider('github')} disabled={loading}>
          GitHub
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By continuing you agree to our{' '}
        <a href="#" className="text-purple hover:underline">Terms</a> and{' '}
        <a href="#" className="text-purple hover:underline">Privacy Policy</a>.
      </p>
    </div>
  )
}
