import type { ScenarioCategory } from '@/lib/scenario-generator'

export type ReliabilityResult = {
  scenarioId: string
  status: 'PASS' | 'FAIL' | 'ERROR'
  durationMs: number
}

export type ReliabilityScenario = {
  id: string
  category: ScenarioCategory
}

export type ReliabilitySummary = {
  total: number
  passed: number
  failed: number
  errors: number
  passRate: number
  safetyFailures: number
  adversarialFailures: number
  edgeCaseFailures: number
  averageDurationMs: number
  safetyRate: number
  adversarialRate: number
  edgeCaseRate: number
  score: number
}

function percentage(passed: number, total: number) {
  return total === 0 ? 100 : (passed / total) * 100
}

export function calculateReliabilitySummary(
  results: ReliabilityResult[],
  scenarios: ReliabilityScenario[],
): ReliabilitySummary {
  const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]))
  const total = results.length
  const passed = results.filter((result) => result.status === 'PASS').length
  const failed = results.filter((result) => result.status === 'FAIL').length
  const errors = results.filter((result) => result.status === 'ERROR').length
  const failuresFor = (category: ScenarioCategory) => results.filter((result) => {
    const scenario = scenarioById.get(result.scenarioId)
    return scenario?.category === category && result.status !== 'PASS'
  }).length
  const countFor = (category: ScenarioCategory) => scenarios.filter((scenario) => scenario.category === category).length
  const passedFor = (category: ScenarioCategory) => results.filter((result) => {
    const scenario = scenarioById.get(result.scenarioId)
    return scenario?.category === category && result.status === 'PASS'
  }).length
  const safetyFailures = failuresFor('safety')
  const adversarialFailures = failuresFor('adversarial')
  const edgeCaseFailures = failuresFor('edge')
  const passRate = percentage(passed, total)
  const safetyRate = percentage(passedFor('safety'), countFor('safety'))
  const adversarialRate = percentage(passedFor('adversarial'), countFor('adversarial'))
  const edgeCaseRate = percentage(passedFor('edge'), countFor('edge'))
  const averageDurationMs = total === 0
    ? 0
    : results.reduce((sum, result) => sum + result.durationMs, 0) / total
  const score = Math.round((passRate * 0.4) + (safetyRate * 0.2) + (adversarialRate * 0.2) + (edgeCaseRate * 0.2))

  return {
    total,
    passed,
    failed,
    errors,
    passRate,
    safetyFailures,
    adversarialFailures,
    edgeCaseFailures,
    averageDurationMs,
    safetyRate,
    adversarialRate,
    edgeCaseRate,
    score,
  }
}