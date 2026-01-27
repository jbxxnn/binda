"use client"

import { usePathname } from "next/navigation"
import React from "react"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from '@hugeicons/react';
import {
    Home01Icon,
    InboxIcon,
    Calendar01Icon,
    Search01Icon,
    Settings01Icon
} from '@hugeicons/core-free-icons';
import { Separator } from "@/components/ui/separator";

// Menu items.
const items = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home01Icon,
    },
    {
        title: "Services",
        url: "/dashboard/services",
        icon: InboxIcon,
    },
    {
        title: "Appointments",
        url: "/dashboard/appointments",
        icon: Calendar01Icon,
    },
    {
        title: "Staff",
        url: "/dashboard/staff",
        icon: Search01Icon,
    },
    {
        title: "Customers",
        url: "/dashboard/customers",
        icon: Search01Icon,
    },
    {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings01Icon,
    },
]

export function AppSidebar() {
    const pathname = usePathname()

    return (
        <Sidebar>
            <SidebarContent className="p-6">
                <SidebarGroup>
                    <SidebarGroupLabel>Application</SidebarGroupLabel>
                    <SidebarGroupContent className="mt-8">
                        <SidebarMenu>
                            {items.map((item, index) => {
                                const isActive = item.url === "/dashboard"
                                    ? pathname === "/dashboard"
                                    : pathname?.startsWith(item.url)

                                return (
                                    <React.Fragment key={item.title}>
                                        <SidebarMenuItem className="">
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive}
                                                className="p-4 py-6"
                                                style={{ borderRadius: '0.3rem' }}
                                            >
                                                <a href={item.url} className="flex items-center gap-4">
                                                    <HugeiconsIcon icon={item.icon} size={20} strokeWidth={2} />
                                                    <span>{item.title}</span>
                                                </a>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        {(index + 1) % 3 === 0 && index !== items.length - 1 && (
                                            <Separator className="my-12" />
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}