"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getProfileImageUrl, getUserInitials } from "@/lib/profile-utils"
import Image from "next/image"

/**
 * ProfileAvatar - A smart avatar component that automatically handles profile images
 * 
 * Features:
 * - Uses Binda-icon.png as default fallback when no profile image is provided
 * - Shows user initials if a custom image fails to load
 * - Supports multiple sizes (sm, md, lg, xl)
 * - Automatically handles null/undefined image URLs
 * 
 * Usage:
 * <ProfileAvatar src={user.avatar_url} name={user.name} size="md" />
 * <ProfileAvatar name="John Doe" size="lg" /> // Will show Binda icon
 */

interface ProfileAvatarProps {
  src?: string | null
  alt?: string
  name?: string
  className?: string
  fallbackClassName?: string
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8", 
  lg: "h-10 w-10",
  xl: "h-12 w-12"
}

export function ProfileAvatar({ 
  src, 
  alt = "Profile", 
  name, 
  className,
  fallbackClassName,
  size = "md"
}: ProfileAvatarProps) {
  const imageUrl = getProfileImageUrl(src)
  const initials = getUserInitials(name)
  
  return (
    <Avatar className={`${sizeClasses[size]} ${className || ""}`}>
      <AvatarImage src={imageUrl} alt={alt} />
      <AvatarFallback className={fallbackClassName}>
        {src ? (
          // If user has a custom image but it failed to load, show initials
          initials
        ) : (
          // If no image provided, show Binda icon
          <Image
            src="/Binda-icon.png"
            alt="Binda"
            width={20}
            height={20}
            className="opacity-60"
          />
        )}
      </AvatarFallback>
    </Avatar>
  )
}
