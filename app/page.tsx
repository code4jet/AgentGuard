import Link from 'next/link'
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Bug,
  Activity,
  GitCompareArrows,
  Plug,
  LineChart,
  Lock,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LandingNav } from '@/components/landing/landing-nav'
import { HeroPreview } from '@/components/landing/hero-preview'
import { Logo } from '@/components/logo'

const features = [
  {
    icon: Sparkles,
    title: 'Adversarial scenario generation',
    body: 'Auto-generate thousands of jailbreaks, prompt injections, and edge cases tuned to your agent\u2019s domain and tools.',
  },
  {
    icon: ShieldCheck,
    title: 'Safe sandboxed execution',
    body: 'Run destructive tests against a mirrored environment. Real tool calls are intercepted \u2014 never your production data.',
  },
  {
    icon: Bug,
    title: 'Failure mode discovery',
    body: 'Cluster failures by category and severity, from hallucinations to data leakage and unauthorized tool use.',
  },
  {
    icon: LineChart,
    title: 'Reliability scoring',
    body: 'A single, defensible reliability score that tracks every release so you ship with confidence.',
  },
  {
    icon: GitCompareArrows,
    title: 'Regression tracking',
    body: 'Catch newly-introduced failures the moment a prompt, model, or tool changes between versions.',
  },
  {
    icon: Activity,
    title: 'Live test runner',
    body: 'Watch scenarios execute in real time with per-step latency, verdicts, and full trace inspection.',
  },
]

const steps = [
  {
    icon: Plug,
    step: '01',
    title: 'Connect your agent',
    body: 'Point AgentGuard at an endpoint or SDK. Map your tools, system prompt, and environment in minutes.',
  },
  {
    icon: Sparkles,
    step: '02',
    title: 'Generate scenarios',
    body: 'Describe your agent and let the engine produce a targeted adversarial suite across every threat category.',
  },
  {
    icon: Zap,
    step: '03',
    title: 'Run & inspect',
    body: 'Execute safely, watch results stream in, and drill into any failure with a full reproducible trace.',
  },
  {
    icon: LineChart,
    step: '04',
    title: 'Measure & ship',
    body: 'Get a reliability report per release, gate deploys on your threshold, and track regressions over time.',
  },
]

const stats = [
  { value: '4.2M+', label: 'Adversarial scenarios run' },
  { value: '38%', label: 'Avg. failure reduction in 30 days' },
  { value: '11', label: 'Threat categories covered' },
  { value: '< 6 min', label: 'Median full-suite runtime' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_70%_0%,var(--color-purple)/8%,transparent_60%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="inline-flex size-1.5 rounded-full bg-turquoise" />
              AI Agent Evaluation &amp; Reliability Engine
            </div>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
              Break your AI agent before your users do.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              Generate adversarial scenarios, test agents safely, discover failure
              modes, and measure reliability before deployment.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button render={<Link href="/login" />} size="lg">
                Start testing free
                <ArrowRight className="size-4" />
              </Button>
              <Button render={<Link href="/dashboard" />} size="lg" variant="outline">
                View live demo
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required. Connect your first agent in under 5 minutes.
            </p>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="px-2 py-8 text-center">
              <div className="font-display text-3xl font-semibold tracking-tight text-foreground">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground text-pretty">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="product" className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <div className="max-w-2xl">
          <span className="text-sm font-medium text-purple">The engine</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
            Everything you need to trust an agent in production
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            AgentGuard closes the loop from red-teaming to reliability metrics, so
            reliability stops being a vibe and becomes a number you can ship against.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-purple/40 hover:shadow-lg hover:shadow-purple/5"
            >
              <div className="inline-flex size-11 items-center justify-center rounded-xl bg-purple/10 text-purple transition-colors group-hover:bg-purple group-hover:text-purple-foreground">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
          <div className="max-w-2xl">
            <span className="text-sm font-medium text-turquoise-foreground">How it works</span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
              From connected to confident in four steps
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl border border-border bg-card p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <s.icon className="size-5" />
                  </div>
                  <span className="font-mono text-sm text-muted-foreground">{s.step}</span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reliability showcase */}
      <section id="reliability" className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary/90 p-8 text-primary-foreground sm:p-12 lg:p-16">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium text-primary-foreground/80">
                <Lock className="size-3.5 text-turquoise" />
                Deploy gating
              </div>
              <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Make reliability a release requirement
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-primary-foreground/70 text-pretty">
                Set a reliability threshold and let AgentGuard block any release that
                introduces critical failures or regresses your score. Every deploy comes
                with a signed report.
              </p>
              <Button render={<Link href="/login" />} size="lg" variant="secondary" className="mt-8">
                Get your reliability score
                <ArrowRight className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Reliability score', value: '87.4', accent: 'text-turquoise' },
                { label: 'Critical failures', value: '34', accent: 'text-destructive' },
                { label: 'Scenarios / release', value: '2,480', accent: 'text-purple' },
                { label: 'Regressions caught', value: '126', accent: 'text-turquoise' },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-5"
                >
                  <div className={`font-display text-3xl font-semibold ${m.accent}`}>
                    {m.value}
                  </div>
                  <div className="mt-1 text-xs text-primary-foreground/60">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-3xl border border-border bg-card px-6 py-14 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
            Ship agents your users can actually trust
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-pretty">
            Start free with 500 scenarios per month. Scale to unlimited runs, regression
            gating, and team reporting when you&apos;re ready.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button render={<Link href="/login" />} size="lg">
              Start testing free
              <ArrowRight className="size-4" />
            </Button>
            <Button render={<Link href="/dashboard" />} size="lg" variant="outline">
              Explore the dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row">
          <Logo />
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} AgentGuard. Test agents, not luck.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
