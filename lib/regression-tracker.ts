export type RegressionStatus = 'improved' | 'stable' | 'regressed'

export type RegressionResultStatus = 'PASS' | 'FAIL' | 'ERROR'

export type RegressionFailure = {
  scenarioId: string
  failureCategory: string
}

export type RegressionScenarioChange = {
  scenarioId: string
  previousStatus: RegressionResultStatus | null
  currentStatus: RegressionResultStatus | null
  previousFailureCategory?: string
  currentFailureCategory?: string
  failure?: string
}

export type RegressionRunSummary = {
  versionLabel: string
  agentId: string
  score: number
  total: number
  passed: number
  failed: number
  errors: number
  results: Array<{ scenarioId: string; status: RegressionResultStatus }>
  failures: RegressionFailure[]
}

export type RegressionComparison = {
  previousVersion: string
  currentVersion: string
  previousScore: number
  currentScore: number
  scoreDifference: number
  previousPassRate: number
  currentPassRate: number
  status: RegressionStatus
  scenarioChanges: RegressionScenarioChange[]
  regressedScenarios: RegressionScenarioChange[]
  newFailureModes: string[]
}

export function compareEvaluationRuns(
  previous: RegressionRunSummary | undefined | null,
  current: RegressionRunSummary | undefined | null,
): RegressionComparison | null {
  if (!previous || !current) return null
  if (previous.agentId !== current.agentId) return null

  if (previous.total === 0 || current.total === 0) {
    return {
      previousVersion: previous.versionLabel,
      currentVersion: current.versionLabel,
      previousScore: previous.score,
      currentScore: current.score,
      scoreDifference: current.score - previous.score,
      previousPassRate: previous.total === 0 ? 0 : Math.round((previous.passed / previous.total) * 100),
      currentPassRate: current.total === 0 ? 0 : Math.round((current.passed / current.total) * 100),
      status: 'stable',
      scenarioChanges: [],
      regressedScenarios: [],
      newFailureModes: [],
    }
  }

  const previousById = new Map(previous.results.map((result) => [result.scenarioId, result.status]))
  const currentById = new Map(current.results.map((result) => [result.scenarioId, result.status]))
  const previousFailureById = new Map(previous.failures.map((entry) => [entry.scenarioId, entry.failureCategory]))
  const currentFailureById = new Map(current.failures.map((entry) => [entry.scenarioId, entry.failureCategory]))
  const allScenarioIds = new Set([...previousById.keys(), ...currentById.keys()])

  const scenarioChanges: RegressionScenarioChange[] = []
  const regressedScenarios: RegressionScenarioChange[] = []
  const newFailureModes = new Set<string>()

  for (const scenarioId of allScenarioIds) {
    const previousStatus = previousById.get(scenarioId) ?? null
    const currentStatus = currentById.get(scenarioId) ?? null
    const previousFailureCategory = previousFailureById.get(scenarioId)
    const currentFailureCategory = currentFailureById.get(scenarioId)

    if (previousStatus !== currentStatus || previousFailureCategory !== currentFailureCategory) {
      const scenarioChange: RegressionScenarioChange = {
        scenarioId,
        previousStatus,
        currentStatus,
        previousFailureCategory,
        currentFailureCategory,
        failure: currentFailureCategory ?? previousFailureCategory,
      }
      scenarioChanges.push(scenarioChange)
    }

    if (previousStatus === 'PASS' && (currentStatus === 'FAIL' || currentStatus === 'ERROR')) {
      regressedScenarios.push({
        scenarioId,
        previousStatus,
        currentStatus,
        previousFailureCategory,
        currentFailureCategory,
        failure: currentFailureCategory ?? previousFailureCategory,
      })
    }

    if (currentFailureCategory && previousFailureCategory !== currentFailureCategory) {
      newFailureModes.add(currentFailureCategory)
    }
  }

  const scoreDifference = current.score - previous.score
  const previousPassRate = Math.round((previous.passed / previous.total) * 100)
  const currentPassRate = Math.round((current.passed / current.total) * 100)
  let status: RegressionStatus = 'stable'
  if (scoreDifference > 0) status = 'improved'
  else if (scoreDifference < 0) status = 'regressed'

  return {
    previousVersion: previous.versionLabel,
    currentVersion: current.versionLabel,
    previousScore: previous.score,
    currentScore: current.score,
    scoreDifference,
    previousPassRate,
    currentPassRate,
    status,
    scenarioChanges,
    regressedScenarios,
    newFailureModes: [...newFailureModes].sort(),
  }
}
