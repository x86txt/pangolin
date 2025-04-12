"use client"

import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@app/lib/cn"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const Command = (
  {
    ref,
    className,
    ...props
  }: React.ComponentPropsWithoutRef<typeof CommandPrimitive> & {
    ref: React.RefObject<React.ElementRef<typeof CommandPrimitive>>;
  }
) => (<CommandPrimitive
  ref={ref}
  className={cn(
    "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
    className
  )}
  {...props}
/>)
Command.displayName = CommandPrimitive.displayName

interface CommandDialogProps extends DialogProps {}

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = (
  {
    ref,
    className,
    ...props
  }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
    ref: React.RefObject<React.ElementRef<typeof CommandPrimitive.Input>>;
  }
) => (<div className="flex items-center border-b px-3" cmdk-input-wrapper="">
  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
  <CommandPrimitive.Input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-md bg-transparent py-3 text-base md:text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
</div>)

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = (
  {
    ref,
    className,
    ...props
  }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.List> & {
    ref: React.RefObject<React.ElementRef<typeof CommandPrimitive.List>>;
  }
) => (<CommandPrimitive.List
  ref={ref}
  className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
  {...props}
/>)

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = (
  {
    ref,
    ...props
  }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty> & {
    ref: React.RefObject<React.ElementRef<typeof CommandPrimitive.Empty>>;
  }
) => (<CommandPrimitive.Empty
  ref={ref}
  className="py-6 text-center text-sm"
  {...props}
/>)

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = (
  {
    ref,
    className,
    ...props
  }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group> & {
    ref: React.RefObject<React.ElementRef<typeof CommandPrimitive.Group>>;
  }
) => (<CommandPrimitive.Group
  ref={ref}
  className={cn(
    "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
    className
  )}
  {...props}
/>)

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = (
  {
    ref,
    className,
    ...props
  }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator> & {
    ref: React.RefObject<React.ElementRef<typeof CommandPrimitive.Separator>>;
  }
) => (<CommandPrimitive.Separator
  ref={ref}
  className={cn("-mx-1 h-px bg-border", className)}
  {...props}
/>)
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = (
  {
    ref,
    className,
    ...props
  }: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> & {
    ref: React.RefObject<React.ElementRef<typeof CommandPrimitive.Item>>;
  }
) => (<CommandPrimitive.Item
  ref={ref}
  className={cn(
    "relative flex cursor-default select-none rounded-md items-center px-2 py-1.5 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
    className,
  )}
  {...props}
/>)

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
