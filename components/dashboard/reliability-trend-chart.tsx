'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { reliabilityTrend } from '@/lib/demo-data'

const config = {
  score: { label: 'Reliability score', color: 'var(--color-chart-2)' },
} satisfies ChartConfig

export function ReliabilityTrendChart() {
  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <AreaChart data={reliabilityTrend} margin={{ left: -12, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillScore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
        />
        <YAxis
          domain={[70, 95]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={40}
          className="text-xs"
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Area
          dataKey="score"
          type="monotone"
          stroke="var(--color-chart-2)"
          strokeWidth={2.5}
          fill="url(#fillScore)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
