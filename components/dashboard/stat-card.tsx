import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaTone = 'neutral',
  hint,
  accent = 'purple',
}: {
  label: string
  value: string
  icon: LucideIcon
  delta?: string
  deltaTone?: 'positive' | 'negative' | 'neutral'
  hint?: string
  accent?: 'purple' | 'turquoise' | 'destructive' | 'primary'
}) {
  const accentMap: Record<string, string> = {
    purple: 'bg-purple/10 text-purple',
    turquoise: 'bg-turquoise/15 text-turquoise-foreground',
    destructive: 'bg-destructive/10 text-destructive',
    primary: 'bg-primary/10 text-primary',
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={cn(
            'inline-flex size-9 items-center justify-center rounded-lg',
            accentMap[accent],
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-display text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              'mb-1 inline-flex items-center gap-0.5 text-xs font-medium',
              deltaTone === 'positive' && 'text-success',
              deltaTone === 'negative' && 'text-destructive',
              deltaTone === 'neutral' && 'text-muted-foreground',
            )}
          >
            {deltaTone === 'positive' && <ArrowUpRight className="size-3.5" />}
            {deltaTone === 'negative' && <ArrowDownRight className="size-3.5" />}
            {delta}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}
