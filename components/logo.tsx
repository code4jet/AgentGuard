import { cn } from '@/lib/utils'

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative inline-flex size-8 items-center justify-center rounded-lg bg-primary">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-5"
          aria-hidden="true"
        >
          <path
            d="M12 2.5 4 5.5v5.2c0 4.6 3.2 8.9 8 10.3 4.8-1.4 8-5.7 8-10.3V5.5L12 2.5Z"
            className="fill-turquoise"
          />
          <path
            d="M12 6.5 8 8v3c0 2.4 1.6 4.6 4 5.4 2.4-.8 4-3 4-5.4V8l-4-1.5Z"
            className="fill-purple"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className="font-display text-lg font-semibold tracking-tight text-foreground">
          Agent<span className="text-purple">Guard</span>
        </span>
      )}
    </span>
  )
}
