import * as React from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        [
          'group relative flex flex-col gap-6 rounded-2xl border border-border/40 bg-white py-6',
          'shadow-sm transition-all duration-300 ease-out',
          'hover:shadow-[0_8px_40px_rgba(15,110,86,0.12)] hover:-translate-y-0.5',
          'hover:border-emerald-200/80',
          'before:absolute before:inset-0 before:rounded-2xl before:opacity-0 before:pointer-events-none',
          'before:ring-2 before:ring-emerald-500/20 before:transition-opacity before:duration-300',
          'hover:before:opacity-100',
          'overflow-hidden',
        ].join(' '),
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6',
        'has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'leading-none font-semibold tracking-tight',
        'transition-colors duration-200',
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        'text-muted-foreground text-sm leading-relaxed',
        className,
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-6', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center px-6 [.border-t]:pt-6',
        'bg-gradient-to-b from-transparent to-emerald-50/30',
        className,
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}