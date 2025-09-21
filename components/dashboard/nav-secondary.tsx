import * as React from "react"
import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    items?: {
      title: string
      url: string
    }[]
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
             const isActive = pathname === item.url || (item.items && item.items.some(subItem => pathname === subItem.url))
             // const isSubItemActive = item.items?.some(subItem => pathname === subItem.url)

            return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild size="sm" className={isActive ? "bg-brand-mint text-brand-hunter hover:bg-brand-mint h-10" : " text-brand-tropical hover:text-brand-hunter hover:bg-brand-mint h-10"}>
                <a href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
