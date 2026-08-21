import type { AgentAdapter } from './types'
import { createDemoCustomerSupportAgent } from '@/lib/demo-agent'

export function resolveAgentAdapter(adapterType: string): AgentAdapter {
  if (adapterType === 'mock') return createDemoCustomerSupportAgent()
  throw new Error(`Adapter type ${adapterType} is not executable in the MVP.`)
}