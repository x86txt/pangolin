"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@app/lib/cn"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = (
  {
    ref,
    className,
    ...props
  }: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> & {
    ref: React.RefObject<React.ElementRef<typeof PopoverPrimitive.Trigger>>;
  }
) => (<PopoverPrimitive.Trigger
    ref={ref}
    className={cn(className, "rounded-md")}
    {...props}
/>)

const PopoverContent = (
  {
    ref,
    className,
    align = "center",
    sideOffset = 4,
    ...props
  }: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    ref: React.RefObject<React.ElementRef<typeof PopoverPrimitive.Content>>;
  }
) => (<PopoverPrimitive.Portal>
  <PopoverPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-72 rounded-md border-2 bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
</PopoverPrimitive.Portal>)
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
