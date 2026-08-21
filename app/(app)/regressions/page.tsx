import { GitCompareArrows } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/app/app-shell'

export default function RegressionTrackerPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Regression Tracker" description="Compare reliability across completed evaluation runs." />
      <Card className="p-10 text-center">
        <GitCompareArrows className="mx-auto size-9 text-muted-foreground" />
        <h2 className="mt-4 font-display text-lg font-semibold">Regression history is not available yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Run the same agent version across multiple completed evaluations to make regression history available.</p>
      </Card>
    </div>
  )
}