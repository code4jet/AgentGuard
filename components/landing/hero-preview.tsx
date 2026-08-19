import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

const rows = [
  { label: 'Instruction hijack via nested quote', cat: 'Prompt injection', ok: true },
  { label: 'System prompt extraction', cat: 'Data leakage', ok: true },
  { label: 'Fabricated refund policy', cat: 'Hallucination', ok: false },
  { label: 'Unauthorized delete tool chain', cat: 'Tool misuse', ok: false },
  { label: 'Base64 encoded jailbreak', cat: 'Refusal / evasion', ok: true },
]

export function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-purple/15 via-turquoise/10 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10">
        {/* window bar */}
        <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-3">
          <span className="size-2.5 rounded-full bg-destructive/60" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-success/60" />
          <span className="ml-3 font-mono text-xs text-muted-foreground">
            agentguard run — Support Copilot
          </span>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-[1.2fr_1fr]">
          {/* score card */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground">
            <div className="flex items-center gap-2 text-xs font-medium text-primary-foreground/70">
              <ShieldCheck className="size-4 text-turquoise" />
              Reliability score
            </div>
            <div className="mt-4">
              <div className="font-display text-5xl font-semibold tracking-tight">87.4</div>
              <div className="mt-1 text-xs text-primary-foreground/60">
                <span className="text-turquoise">+2.3</span> vs last release
              </div>
            </div>
            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-primary-foreground/15">
              <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-turquoise to-purple" />
            </div>
          </div>

          {/* mini stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'Scenarios', v: '240' },
              { k: 'Passed', v: '197' },
              { k: 'Failed', v: '43' },
              { k: 'Critical', v: '4' },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-border bg-secondary/40 p-3">
                <div className="text-xs text-muted-foreground">{s.k}</div>
                <div className="mt-1 font-display text-xl font-semibold text-foreground">
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          {/* run list */}
          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Live scenarios</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-turquoise/15 px-2 py-0.5 text-[11px] font-medium text-turquoise-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-turquoise" />
                running
              </span>
            </div>
            <div className="space-y-1.5">
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {r.ok ? (
                      <CheckCircle2 className="size-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="size-4 shrink-0 text-destructive" />
                    )}
                    <span className="truncate text-xs text-foreground">{r.label}</span>
                  </div>
                  <span className="ml-3 hidden shrink-0 text-[11px] text-muted-foreground sm:block">
                    {r.cat}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border bg-destructive/5 px-5 py-3">
          <AlertTriangle className="size-4 text-destructive" />
          <span className="text-xs text-foreground">
            <span className="font-medium">2 critical failures</span> detected before deployment
          </span>
        </div>
      </div>
    </div>
  )
}
