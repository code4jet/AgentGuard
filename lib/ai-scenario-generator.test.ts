import assert from 'node:assert/strict'
import test from 'node:test'
import { generateAiScenarios, validateAiScenarios } from './ai-scenario-generator'
import { generateScenarios } from './scenario-generator'

const agent = { name: 'Demo Agent', description: 'Customer support', adapterType: 'mock', tools: ['search_customer', 'get_order', 'refund_order', 'send_email'] }
const categories = ['normal', 'edge', 'adversarial', 'safety'] as const
const options = { count: 4, categories: [...categories], agent }

function validPayload() {
  return JSON.stringify({ scenarios: categories.map((category, index) => ({
    category,
    title: `${category} generated test`,
    input: `Run ${category} test ${index + 1}.`,
    expectedRisk: category === 'normal' ? 'none' : `${category}_risk`,
    difficulty: category === 'normal' ? 'low' : 'high',
  })) })
}

function fakeFetch(content: string, ok = true): typeof fetch {
  return (async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: ok ? 200 : 500 })) as typeof fetch
}

test('valid AI output is normalized to the existing scenario schema', async () => {
  const result = await generateAiScenarios({ ...options, apiKey: 'test-key', fetchImpl: fakeFetch(validPayload()) })
  assert.equal(result.mode, 'ai')
  assert.equal(result.scenarios.length, 4)
  assert.deepEqual(result.scenarios.map((scenario) => scenario.category), [...categories])
  assert.ok(result.scenarios.every((scenario) => scenario.id && scenario.title && scenario.input && scenario.expectedRisk && scenario.difficulty))
})

test('all four categories are accepted', () => {
  const scenarios = validateAiScenarios(JSON.parse(validPayload()).scenarios, options)
  assert.deepEqual(new Set(scenarios.map((scenario) => scenario.category)), new Set(categories))
})

test('invalid AI output is rejected and falls back deterministically', async () => {
  const result = await generateAiScenarios({ ...options, apiKey: 'test-key', category: 'edge', count: 2, categories: ['edge'], fetchImpl: fakeFetch(JSON.stringify({ scenarios: [{ category: 'edge', title: 'Missing fields' }] })) })
  assert.equal(result.mode, 'deterministic-fallback')
  assert.equal(result.scenarios.length, 2)
  assert.ok(result.scenarios.every((scenario) => scenario.category === 'edge'))
})

test('OpenAI failure falls back deterministically', async () => {
  const result = await generateAiScenarios({ ...options, apiKey: 'test-key', category: 'safety', count: 2, categories: ['safety'], fetchImpl: fakeFetch('', false) })
  assert.equal(result.mode, 'deterministic-fallback')
  assert.equal(result.scenarios.length, 2)
})

test('missing API key falls back without calling OpenAI', async () => {
  let called = false
  const result = await generateAiScenarios({ ...options, fetchImpl: (async () => { called = true; return new Response() }) as typeof fetch })
  assert.equal(result.mode, 'deterministic-fallback')
  assert.equal(called, false)
})

test('existing deterministic generator remains available', () => {
  const scenarios = generateScenarios({ count: 13 })
  assert.equal(scenarios.length, 13)
  assert.deepEqual(new Set(scenarios.map((scenario) => scenario.category)), new Set(categories))
})
