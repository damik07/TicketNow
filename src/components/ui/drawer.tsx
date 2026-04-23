"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

type DrawerOverlayProps = React.ComponentProps<typeof DrawerPrimitive.Overlay>
type DrawerContentProps = React.ComponentProps<typeof DrawerPrimitive.Content>
type DrawerTitleProps = React.ComponentProps<typeof DrawerPrimitive.Title>
type DrawerDescriptionProps = React.ComponentProps<typeof DrawerPrimitive.Description>

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Overlay>, DrawerOverlayProps>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props} />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Content>, DrawerContentProps>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
        className
      )}
      {...props}>
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = "DrawerContent"

type DrawerHeaderProps = React.HTMLAttributes<HTMLDivElement>
const DrawerHeader = React.forwardRef<HTMLDivElement, DrawerHeaderProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props} />
))
DrawerHeader.displayName = "DrawerHeader"

type DrawerFooterProps = React.HTMLAttributes<HTMLDivElement>
const DrawerFooter = React.forwardRef<HTMLDivElement, DrawerFooterProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props} />
))
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Title>, DrawerTitleProps>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props} />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Description>, DrawerDescriptionProps>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}