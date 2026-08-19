'use client'

import { Cell, Pie, PieChart } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { failureDistribution } from '@/lib/demo-data'

const config = {
  count: { label: 'Failures' },
} satisfies ChartConfig

const total = failureDistribution.reduce((a, b) => a + b.count, 0)

export function FailureDistributionChart() {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <ChartContainer config={config} className="aspect-square h-[200px]">
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={failureDistribution}
            dataKey="count"
            nameKey="category"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            strokeWidth={2}
          >
            {failureDistribution.map((entry) => (
              <Cell key={entry.category} fill={entry.fill} stroke="var(--color-card)" />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="w-full flex-1 space-y-2.5">
        {failureDistribution.map((f) => (
          <li key={f.category} className="flex items-center gap-3 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: f.fill }}
            />
            <span className="flex-1 text-muted-foreground">{f.category}</span>
            <span className="font-medium text-foreground tabular-nums">{f.count}</span>
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
              {Math.round((f.count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
