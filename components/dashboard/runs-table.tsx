import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { StatusBadge } from '@/components/status-badges'
import { recentRuns } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

export function RunsTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Suite</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Pass rate</th>
              <th className="px-4 py-3 text-right font-medium">Critical</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell">Duration</th>
              <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Started</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {recentRuns.map((run) => (
              <tr
                key={run.id}
                className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50"
              >
                <td className="px-4 py-3 font-medium text-foreground">{run.agent}</td>
                <td className="px-4 py-3 text-muted-foreground">{run.suite}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={run.status} />
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  <span
                    className={cn(
                      run.passRate >= 95
                        ? 'text-success'
                        : run.passRate >= 85
                          ? 'text-foreground'
                          : 'text-destructive',
                    )}
                  >
                    {run.passRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {run.critical > 0 ? (
                    <span className="text-destructive">{run.critical}</span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="hidden px-4 py-3 text-right font-mono tabular-nums text-muted-foreground md:table-cell">
                  {run.duration}
                </td>
                <td className="hidden px-4 py-3 text-right text-muted-foreground sm:table-cell">
                  {run.started}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href="/results"
                    className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`View results for ${run.agent}`}
                  >
                    <ArrowUpRight className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
