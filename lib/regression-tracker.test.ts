import assert from 'node:assert/strict'
import test from 'node:test'
import { compareEvaluationRuns } from './regression-tracker'

type TestResult = {
  scenarioId: string
  status: 'PASS' | 'FAIL' | 'ERROR'
}

type TestRun = {
  versionLabel: string
  agentId: string
  score: number
  total: number
  passed: number
  failed: number
  errors: number
  results: TestResult[]
  failures: Array<{ scenarioId: string; failureCategory: string }>
}

function makeRun(overrides: Partial<TestRun> = {}): TestRun {
  return {
    versionLabel: 'v1.0.0',
    agentId: 'agent-1',
    score: 100,
    total: 2,
    passed: 2,
    failed: 0,
    errors: 0,
    results: [
      { scenarioId: 's1', status: 'PASS' },
      { scenarioId: 's2', status: 'PASS' },
    ],
    failures: [],
    ...overrides,
  }
}

test('1. No previous run -> empty state', () => {
  const report = compareEvaluationRuns(undefined, makeRun({ versionLabel: 'v1.1.0' }))
  assert.equal(report, null)
})

test('2. Identical scores -> stable', () => {
  const previous = makeRun({ versionLabel: 'v1.0.0', score: 100, passed: 2, total: 2 })
  const current = makeRun({ versionLabel: 'v1.1.0', score: 100, passed: 2, total: 2 })
  const report = compareEvaluationRuns(previous, current)
  assert.ok(report)
  assert.equal(report?.status, 'stable')
})

test('3. Higher current score -> improved', () => {
  const previous = makeRun({ versionLabel: 'v1.0.0', score: 90, passed: 1, total: 2 })
  const current = makeRun({ versionLabel: 'v1.1.0', score: 100, passed: 2, total: 2 })
  const report = compareEvaluationRuns(previous, current)
  assert.ok(report)
  assert.equal(report?.status, 'improved')
  assert.equal(report?.scoreDifference, 10)
})

test('4. Lower current score -> regression', () => {
  const previous = makeRun({ versionLabel: 'v1.0.0', score: 100, passed: 2, total: 2 })
  const current = makeRun({ versionLabel: 'v1.1.0', score: 80, passed: 1, total: 2, results: [
    { scenarioId: 's1', status: 'PASS' },
    { scenarioId: 's2', status: 'FAIL' },
  ], failures: [{ scenarioId: 's2', failureCategory: 'safety_violation' }] })
  const report = compareEvaluationRuns(previous, current)
  assert.ok(report)
  assert.equal(report?.status, 'regressed')
  assert.equal(report?.scoreDifference, -20)
})

test('5. PASS -> FAIL scenario regression', () => {
  const previous = makeRun({ versionLabel: 'v1.0.0', score: 100, passed: 2, total: 2, results: [
    { scenarioId: 's1', status: 'PASS' },
    { scenarioId: 's2', status: 'PASS' },
  ] })
  const current = makeRun({ versionLabel: 'v1.1.0', score: 50, passed: 1, total: 2, results: [
    { scenarioId: 's1', status: 'PASS' },
    { scenarioId: 's2', status: 'FAIL' },
  ], failures: [{ scenarioId: 's2', failureCategory: 'not_found' }] })
  const report = compareEvaluationRuns(previous, current)
  assert.ok(report)
  assert.ok(report?.scenarioChanges.some((change) => change.scenarioId === 's2' && change.previousStatus === 'PASS' && change.currentStatus === 'FAIL'))
})

test('6. Newly introduced failure category', () => {
  const previous = makeRun({ versionLabel: 'v1.0.0', score: 100, results: [{ scenarioId: 's1', status: 'PASS' }] })
  const current = makeRun({ versionLabel: 'v1.1.0', score: 60, total: 1, passed: 0, failed: 1, results: [{ scenarioId: 's1', status: 'FAIL' }], failures: [{ scenarioId: 's1', failureCategory: 'prompt_injection' }] })
  const report = compareEvaluationRuns(previous, current)
  assert.ok(report)
  assert.ok(report?.newFailureModes.includes('prompt_injection'))
})

test('7. Incomplete run is ignored', () => {
  const previous = makeRun({ versionLabel: 'v1.0.0', score: 100, passed: 2, total: 2 })
  const incomplete = { ...makeRun({ versionLabel: 'v1.0.1', score: 0, total: 0, passed: 0, errors: 0, results: [], failures: [] }), agentId: 'agent-1' }
  const report = compareEvaluationRuns(previous, incomplete)
  assert.ok(report)
  assert.equal(report?.status, 'stable')
  assert.equal(report?.currentVersion, 'v1.0.1')
})

test('8. Different agents are not compared', () => {
  const previous = makeRun({ versionLabel: 'v1.0.0', agentId: 'agent-1', score: 100 })
  const current = makeRun({ versionLabel: 'v1.1.0', agentId: 'agent-2', score: 80 })
  const report = compareEvaluationRuns(previous, current)
  assert.equal(report, null)
})
