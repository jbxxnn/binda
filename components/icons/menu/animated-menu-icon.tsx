"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AnimatedMenuIconProps {
  size?: number
  isOpen?: boolean
  onClick?: () => void
  className?: string
}

export function AnimatedMenuIcon({ 
  size = 24,
  isOpen = false,
  onClick,
  className
}: AnimatedMenuIconProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-transform duration-300 ease-in-out",
        isOpen ? "rotate-180" : "rotate-0",
        className
      )}
      aria-label="Toggle menu"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="lucide lucide-align-right"
      >
        <path d="M21 12H9" />
        <path d="M21 18H7" />
        <path d="M21 6H3" />
      </svg>
    </button>
  )
}