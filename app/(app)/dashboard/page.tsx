import type { Metadata } from 'next'
import { Activity, ShieldAlert, Target, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/dashboard/stat-card'
import { ReliabilityTrendChart } from '@/components/dashboard/reliability-trend-chart'
import { FailureDistributionChart } from '@/components/dashboard/failure-distribution-chart'
import { RunsTable } from '@/components/dashboard/runs-table'
import { ReliabilityScore } from '@/components/dashboard/reliability-score'
import { agents, recentRuns } from '@/lib/demo-data'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default function DashboardPage() {
  const activeAgents = agents.filter((a) => a.status === 'connected').length

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Reliability overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Adversarial coverage across all connected agents, updated after every run.
          </p>
        </div>
            <Button render={<Link href="/scenarios" />} nativeButton={false}>
          <Zap className="size-4" />
          New test run
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Reliability score"
          value="87.4"
          icon={Target}
          delta="+2.3"
          deltaTone="positive"
          hint="7-day rolling average"
          accent="turquoise"
        />
        <StatCard
          label="Scenarios run"
          value="14,208"
          icon={Activity}
          delta="+1,842"
          deltaTone="positive"
          hint="Across all agents this week"
          accent="purple"
        />
        <StatCard
          label="Critical failures"
          value="23"
          icon={ShieldAlert}
          delta="-11"
          deltaTone="positive"
          hint="Down from last week"
          accent="destructive"
        />
        <StatCard
          label="Active agents"
          value={String(activeAgents)}
          icon={Zap}
          hint="Connected and monitored"
          accent="primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between p-6 pb-0">
            <div>
              <h2 className="font-display text-lg font-medium text-foreground">
                Reliability trend
              </h2>
              <p className="text-sm text-muted-foreground">Pass rate vs. critical failures</p>
            </div>
          </div>
          <ReliabilityTrendChart />
        </Card>

        <ReliabilityScore />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="p-6 pb-0">
            <h2 className="font-display text-lg font-medium text-foreground">
              Failure categories
            </h2>
            <p className="text-sm text-muted-foreground">Where agents break most often</p>
          </div>
          <FailureDistributionChart />
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between p-6 pb-2">
            <div>
              <h2 className="font-display text-lg font-medium text-foreground">Recent runs</h2>
              <p className="text-sm text-muted-foreground">Latest adversarial test batches</p>
            </div>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/results" />}>
              View all
            </Button>
          </div>
          <RunsTable runs={recentRuns.slice(0, 6)} />
        </Card>
      </div>
    </div>
  )
}
