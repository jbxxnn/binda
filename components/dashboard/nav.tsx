"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/services", label: "Services" },
    { href: "/dashboard/staff", label: "Staff" },
    { href: "/dashboard/customers", label: "Customers" },
    { href: "/dashboard/settings/tenant", label: "Settings" },
];

export function DashboardNav() {
    const pathname = usePathname();

    return (
        <nav className="flex items-center gap-4 h-6">
            {links.map((link) => {
                const isActive = link.href === "/dashboard"
                    ? pathname === link.href
                    : pathname.startsWith(link.href);
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "text-sm font-medium transition-colors hover:font-bold",
                            isActive ? "text-primary-foreground font-bold bg-accent px-4 py-1 rounded-full" : "text-muted-foreground"
                        )}
                    >
                        {link.label}
                    </Link>
                );
            })}
        </nav>
    );
}
