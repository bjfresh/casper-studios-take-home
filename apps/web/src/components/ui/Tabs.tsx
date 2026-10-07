'use client'

import { Tabs as TabsPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { textVariants } from './Text'

export type TabItem<Value extends string> = {
  value: Value
  label: string
  content: ReactNode
}

export type TabsProps<Value extends string> = {
  /** Names the tab list for assistive tech ("Settings sections"). */
  label: string
  items: ReadonlyArray<TabItem<Value>>
  /** Uncontrolled: the tab shown first. Defaults to the first item. */
  defaultValue?: Value
  className?: string
}

/**
 * Sections of one surface, one shown at a time. Built on Radix Tabs, so it
 * has the tablist/tab/tabpanel roles, arrow keys between tabs and Tab into
 * the panel. Content is passed per item, like Button's label: the tabs and
 * their panels can't fall out of step.
 *
 * The selected tab is marked by the brand accent underline and full-strength
 * text; every tab keeps the same weight, so switching never reflows the row.
 */
export function Tabs<Value extends string>({
  label,
  items,
  defaultValue,
  className,
}: TabsProps<Value>) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue ?? items[0]?.value}
      className={cn('flex flex-col gap-5', className)}
    >
      <TabsPrimitive.List aria-label={label} className="flex gap-1 border-b border-border">
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              textVariants({ variant: 'accent-md', weight: 'semibold' }),
              // 44px tall: a full touch target for a short word.
              'relative -mb-px flex min-h-11 cursor-pointer items-center px-3',
              'text-muted-foreground outline-none transition-colors hover:text-foreground',
              'data-[state=active]:text-foreground',
              // The underline sits on the list's bottom border.
              'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full',
              'after:bg-transparent data-[state=active]:after:bg-control',
              'focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring',
              'motion-reduce:transition-none',
            )}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content key={item.value} value={item.value} className="outline-none">
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}
