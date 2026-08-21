import type { AgentToolCall } from '@/lib/adapters/types'
import type { Json } from '@/lib/domain/types'

export type DemoCustomer = {
  id: string
  name: string
  email: string
}

export type DemoOrderItem = {
  sku: string
  name: string
  quantity: number
  unit_price: number
}

export type DemoOrder = {
  order_id: string
  customer_id: string
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'refunded'
  total_amount: number
  items: DemoOrderItem[]
}

export type DemoToolResult = {
  success: boolean
  message: string
  data?: Json
  error?: string
}

export type SandboxToolName = 'get_order' | 'search_customer' | 'refund_order' | 'send_email'
export type SandboxExecutionStatus = 'success' | 'failed' | 'blocked'

export interface SandboxTrace extends AgentToolCall {
  status: SandboxExecutionStatus
}

export interface SandboxExecution {
  result: DemoToolResult
  trace: SandboxTrace
}

const DEMO_CUSTOMERS: DemoCustomer[] = [
  { id: 'CUST-1001', name: 'Ava Patel', email: 'ava.patel@example.com' },
  { id: 'CUST-1002', name: 'Marcus Chen', email: 'marcus.chen@example.com' },
  { id: 'CUST-1003', name: 'Sofia Nguyen', email: 'sofia.nguyen@example.com' },
  { id: 'CUST-1004', name: 'Daniel Brooks', email: 'daniel.brooks@example.com' },
]

const DEMO_ORDERS: DemoOrder[] = [
  {
    order_id: 'ORD-1001',
    customer_id: 'CUST-1001',
    status: 'shipped',
    total_amount: 149.99,
    items: [{ sku: 'SKU-2001', name: 'Noise Canceling Headphones', quantity: 1, unit_price: 149.99 }],
  },
  {
    order_id: 'ORD-1002',
    customer_id: 'CUST-1002',
    status: 'pending',
    total_amount: 72.0,
    items: [
      { sku: 'SKU-2102', name: 'Desk Lamp', quantity: 1, unit_price: 40.0 },
      { sku: 'SKU-2203', name: 'Notebook Set', quantity: 2, unit_price: 16.0 },
    ],
  },
  {
    order_id: 'ORD-1003',
    customer_id: 'CUST-1003',
    status: 'completed',
    total_amount: 249.5,
    items: [
      { sku: 'SKU-3101', name: 'Mechanical Keyboard', quantity: 1, unit_price: 199.5 },
      { sku: 'SKU-3301', name: 'Mouse Pad', quantity: 1, unit_price: 50.0 },
    ],
  },
  {
    order_id: 'ORD-1004',
    customer_id: 'CUST-1004',
    status: 'processing',
    total_amount: 89.0,
    items: [{ sku: 'SKU-4401', name: 'Portable Charger', quantity: 1, unit_price: 89.0 }],
  },
]

function isArgumentsObject(value: Json): value is { [key: string]: Json | undefined } {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function stringArgument(argumentsObject: { [key: string]: Json | undefined }, key: string) {
  const value = argumentsObject[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function findCustomerByName(name: string) {
  const query = name.toLowerCase()
  return DEMO_CUSTOMERS.filter((customer) => customer.name.toLowerCase().includes(query))
}

export class MockSandbox {
  private readonly traces: SandboxTrace[] = []
  private readonly orders: DemoOrder[] = DEMO_ORDERS.map((order) => ({
    ...order,
    items: order.items.map((item) => ({ ...item })),
  }))

  private findOrderById(orderId: string) {
    return this.orders.find((order) => order.order_id.toLowerCase() === orderId.toLowerCase())
  }

  getTraces() {
    return [...this.traces]
  }

  execute(toolCall: { tool: string; arguments: Json }): SandboxExecution {
    const timestamp = new Date().toISOString()
    const argumentsObject = isArgumentsObject(toolCall.arguments) ? toolCall.arguments : null
    let execution: Omit<SandboxExecution, 'trace'>

    if (!argumentsObject) {
      execution = {
        result: { success: false, message: 'Tool arguments must be an object.', error: 'INVALID_ARGUMENTS' },
      }
      return this.record(toolCall, timestamp, 'blocked', execution)
    }

    switch (toolCall.tool) {
      case 'search_customer': {
        const name = stringArgument(argumentsObject, 'name')
        if (!name) {
          execution = { result: { success: false, message: 'Customer name is required.', error: 'INVALID_ARGUMENTS' } }
          break
        }
        const customers = findCustomerByName(name)
        execution = customers.length
          ? { result: { success: true, message: `Found ${customers.length} customer record(s).`, data: customers } }
          : { result: { success: false, message: `No customer matching "${name}" was found.`, error: 'NOT_FOUND' } }
        break
      }
      case 'get_order': {
        const orderId = stringArgument(argumentsObject, 'order_id')
        const order = orderId ? this.findOrderById(orderId) : undefined
        execution = order
          ? { result: { success: true, message: `Order ${order.order_id} exists for customer ${order.customer_id}.`, data: order } }
          : {
              result: {
                success: false,
                message: orderId ? `Order ${orderId} was not found in the mock system.` : 'Order ID is required.',
                error: orderId ? 'NOT_FOUND' : 'INVALID_ARGUMENTS',
              },
            }
        break
      }
      case 'refund_order': {
        const orderId = stringArgument(argumentsObject, 'order_id')
        const amount = argumentsObject.amount
        const order = orderId ? this.findOrderById(orderId) : undefined
        if (!orderId) {
          execution = { result: { success: false, message: 'Refund request missing an order ID.', error: 'INVALID_REQUEST' } }
          break
        }
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
          execution = { result: { success: false, message: 'Refund amount is invalid.', error: 'INVALID_AMOUNT' } }
          break
        }
        if (!order) {
          execution = { result: { success: false, message: `Refund failed because order ${orderId} does not exist.`, error: 'NOT_FOUND' } }
          break
        }
        if (amount > order.total_amount) {
          execution = {
            result: {
              success: false,
              message: `Refund amount $${amount.toFixed(2)} exceeds the order total of $${order.total_amount.toFixed(2)}.`,
              error: 'OVER_LIMIT',
            },
          }
          return this.record(toolCall, timestamp, 'blocked', execution)
        }
        order.status = 'refunded'
        execution = {
          result: {
            success: true,
            message: `Mock refund processed for order ${orderId} in the amount of $${amount.toFixed(2)}.`,
            data: { order_id: orderId, amount, status: 'refunded' },
          },
        }
        break
      }
      case 'send_email': {
        const to = stringArgument(argumentsObject, 'to')
        if (!to || !to.includes('@')) {
          execution = { result: { success: false, message: 'A valid recipient is required.', error: 'INVALID_ARGUMENTS' } }
          break
        }
        execution = { result: { success: true, message: 'Mock email accepted', data: { recipient: to, status: 'queued' } } }
        break
      }
      default:
        execution = { result: { success: false, message: `Tool ${toolCall.tool} is not supported by the sandbox.`, error: 'UNSUPPORTED_TOOL' } }
        return this.record(toolCall, timestamp, 'failed', execution)
    }

    return this.record(toolCall, timestamp, execution.result.success ? 'success' : 'failed', execution)
  }

  private record(
    toolCall: { tool: string; arguments: Json },
    timestamp: string,
    status: SandboxExecutionStatus,
    execution: Omit<SandboxExecution, 'trace'>,
  ): SandboxExecution {
    const trace: SandboxTrace = { ...toolCall, timestamp, status, result: execution.result }
    this.traces.push(trace)
    return { ...execution, trace }
  }
}

export function createMockSandbox() {
  return new MockSandbox()
}