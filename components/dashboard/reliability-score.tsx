'use client'

import { Card } from '@/components/ui/card'
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'

const score = 87.4

const data = [{ name: 'score', value: score, fill: 'var(--color-turquoise)' }]

export function ReliabilityScore() {
  return (
    <Card className="flex flex-col p-6">
      <h2 className="font-display text-lg font-medium text-foreground">Reliability score</h2>
      <p className="text-sm text-muted-foreground">Composite across all agents</p>

      <div className="relative mx-auto mt-2 flex items-center justify-center">
        <ChartContainer
          config={{ value: { label: 'Score' } }}
          className="aspect-square h-52 w-52"
        >
          <RadialBarChart
            data={data}
            startAngle={90}
            endAngle={-270}
            innerRadius={80}
            outerRadius={100}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background cornerRadius={12} />
          </RadialBarChart>
        </ChartContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-semibold tracking-tight text-foreground">
            {score}
          </span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">/ 100</span>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Prompt injection resistance</span>
          <span className="font-medium text-foreground">91</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Tool-use accuracy</span>
          <span className="font-medium text-foreground">85</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Hallucination control</span>
          <span className="font-medium text-foreground">83</span>
        </div>
      </div>
    </Card>
  )
}
