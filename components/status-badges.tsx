import { cn } from '@/lib/utils'
import type { Severity, RunStatus } from '@/lib/demo-data'

export function SeverityBadge({ severity }: { severity: Severity }) {
  const styles: Record<Severity, string> = {
    critical: 'bg-destructive/10 text-destructive ring-destructive/20',
    high: 'bg-warning/15 text-warning-foreground ring-warning/30',
    medium: 'bg-purple/10 text-purple ring-purple/20',
    low: 'bg-muted text-muted-foreground ring-border',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
        styles[severity],
      )}
    >
      {severity}
    </span>
  )
}

export function StatusBadge({ status }: { status: RunStatus | 'connected' | 'degraded' | 'offline' }) {
  const map: Record<string, { label: string; className: string; dot: string }> = {
    passed: { label: 'Passed', className: 'bg-success/10 text-success ring-success/20', dot: 'bg-success' },
    failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive ring-destructive/20', dot: 'bg-destructive' },
    running: { label: 'Running', className: 'bg-turquoise/15 text-turquoise-foreground ring-turquoise/30', dot: 'bg-turquoise animate-pulse' },
    queued: { label: 'Queued', className: 'bg-muted text-muted-foreground ring-border', dot: 'bg-muted-foreground' },
    connected: { label: 'Connected', className: 'bg-success/10 text-success ring-success/20', dot: 'bg-success' },
    degraded: { label: 'Degraded', className: 'bg-warning/15 text-warning-foreground ring-warning/30', dot: 'bg-warning' },
    offline: { label: 'Offline', className: 'bg-muted text-muted-foreground ring-border', dot: 'bg-muted-foreground' },
  }
  const s = map[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        s.className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  )
}
