"use client"

import * as React from "react"
import {
  Users,
  DollarSign,
  FileText,
  BarChart3,
  Settings2,
  HelpCircle,
  MessageSquare,
  Home,
  Plus,
} from "lucide-react"

import { NavMain } from "@/components/dashboard/nav-main"
import { NavProjects } from "@/components/dashboard/nav-projects"
import { NavSecondary } from "@/components/dashboard/nav-secondary"
import { NavUser } from "@/components/dashboard/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Customers",
      url: "/dashboard/customers",
      icon: Users,
     
    },
    {
      title: "Transactions",
      url: "/dashboard/transactions",
      icon: DollarSign,
      items: [
        {
          title: "All Transactions",
          url: "/dashboard/transactions",
        },
        {
          title: "New Transaction",
          url: "/dashboard/transactions/new",
        },
      ],
    },
    {
      title: "Invoices",
      url: "/dashboard/invoices",
      icon: FileText,
      items: [
        {
          title: "All Invoices",
          url: "/dashboard/invoices",
        },
        {
          title: "Create Invoice",
          url: "/dashboard/invoices/new",
        },
      ],
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: BarChart3,
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings2,
      items: [
        {
          title: "Business Profile",
          url: "/dashboard/settings/profile",
        },
        {
          title: "Billing",
          url: "/dashboard/settings/billing",
        },
        {
          title: "Team",
          url: "/dashboard/settings/team",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "/support",
      icon: HelpCircle,
    },
    {
      title: "Feedback",
      url: "/feedback",
      icon: MessageSquare,
    },
  ],
  projects: [
    {
      name: "Quick Actions",
      url: "#",
      icon: Plus,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="floating" className="bg-brand-lightning border border-brand-tropical p-0 rounded-lg" {...props}>
      <SidebarHeader className="bg-brand-lightning w-full border-b border-brand-tropical rounded-tl-lg rounded-tr-lg">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <DollarSign className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Binda</span>
                  <span className="truncate text-xs text-muted-foreground">Business Management</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 bg-brand-lightning border-b border-brand-tropical w-full">
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="bg-brand-lightning border-t border-brand-tropical w-full rounded-bl-lg rounded-br-lg">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
