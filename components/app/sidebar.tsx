'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { navGroups } from '@/components/app/nav-config'

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href
  // Configuration is a sub-route of /agents, keep them distinct.
  if (href === '/agents') return pathname === '/agents'
  return pathname === href || pathname.startsWith(href + '/')
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Link href="/dashboard" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <div className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                      )}
                    >
                      <item.icon
                        className={cn(
                          'size-4 shrink-0',
                          active ? 'text-purple' : 'text-muted-foreground group-hover:text-foreground',
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-xl bg-gradient-to-br from-primary to-primary/85 p-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary-foreground/70">Free plan</span>
            <span className="text-xs text-turquoise">318 / 500</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary-foreground/15">
            <div className="h-full w-[63%] rounded-full bg-gradient-to-r from-turquoise to-purple" />
          </div>
          <p className="mt-2.5 text-xs text-primary-foreground/60">
            Scenarios used this month
          </p>
        </div>
        <a
          href="#"
          className="mt-3 flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="size-3.5" />
          Docs &amp; support
        </a>
      </div>
    </div>
  )
}
