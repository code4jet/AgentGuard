import {
  LayoutDashboard,
  Plug,
  SlidersHorizontal,
  Sparkles,
  PlayCircle,
  ListChecks,
  ShieldCheck,
  GitCompareArrows,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Testing',
    items: [
      { label: 'Agents', href: '/agents', icon: Plug },
      { label: 'Configuration', href: '/agents/configure', icon: SlidersHorizontal },
      { label: 'Scenario Generator', href: '/scenarios', icon: Sparkles },
      { label: 'Test Runner', href: '/runner', icon: PlayCircle },
      { label: 'Results', href: '/results', icon: ListChecks },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reliability Report', href: '/reliability', icon: ShieldCheck },
      { label: 'Regression Tracker', href: '/regressions', icon: GitCompareArrows },
    ],
  },
]
