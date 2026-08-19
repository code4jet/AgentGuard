import Link from 'next/link'
import { ShieldCheck, Quote } from 'lucide-react'
import { Logo } from '@/components/logo'
import { AuthForm } from '@/components/auth/auth-form'

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-primary/90 p-10 text-primary-foreground lg:flex">
        <div className="pointer-events-none absolute -right-24 top-1/4 size-96 rounded-full bg-purple/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-10 size-72 rounded-full bg-turquoise/15 blur-3xl" />

        <Link href="/" className="relative">
          <span className="inline-flex items-center gap-2.5">
            <span className="relative inline-flex size-8 items-center justify-center rounded-lg bg-primary-foreground/10">
              <ShieldCheck className="size-5 text-turquoise" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              Agent<span className="text-turquoise">Guard</span>
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <Quote className="size-8 text-purple" />
          <p className="mt-4 font-display text-2xl font-medium leading-snug text-balance">
            We caught two critical tool-misuse failures the night before launch.
            AgentGuard paid for itself in a single run.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-foreground/10 font-display font-semibold">
              JR
            </span>
            <div>
              <div className="text-sm font-medium">Jordan Reyes</div>
              <div className="text-xs text-primary-foreground/60">
                Head of AI Platform, Northwind
              </div>
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-primary-foreground/10 pt-6 text-center">
          {[
            { v: '87.4', l: 'Avg. score' },
            { v: '4.2M+', l: 'Scenarios' },
            { v: '11', l: 'Threat types' },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-display text-xl font-semibold text-turquoise">{s.v}</div>
              <div className="text-xs text-primary-foreground/60">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div className="flex flex-col items-center justify-center bg-background px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/">
              <Logo />
            </Link>
          </div>
          <AuthForm />
        </div>
      </div>
    </div>
  )
}
