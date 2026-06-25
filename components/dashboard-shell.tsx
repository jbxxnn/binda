import type { Route } from "next";
import Link from "next/link";

export function DashboardShell({
  title,
  subtitle,
  children,
  role
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  role: "vendor" | "admin";
}) {
  const links: Array<{ href: Route; label: string }> =
    role === "admin"
      ? [
          { href: "/admin", label: "Overview" },
          { href: "/admin/businesses", label: "Businesses" },
          { href: "/admin/enquiries", label: "Enquiries" }
        ]
      : [
          { href: "/vendor", label: "Overview" },
          { href: "/vendor/record-sale", label: "Record sale" },
          { href: "/vendor/products", label: "Products" },
          { href: "/vendor/customers", label: "Customers" },
          { href: "/vendor/reports", label: "Reports" },
          { href: "/vendor/business-profile", label: "Business profile" },
          { href: "/vendor/settings", label: "Settings" }
        ];

  return (
    <main className="shell grid">
      <section className="hero">
        <div className="row">
          <div>
            <span className="pill">{role === "admin" ? "Admin dashboard" : "Vendor dashboard"}</span>
            <h1 style={{ marginTop: 16 }}>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Link className="button secondary" href="/">
              Home
            </Link>
            <Link className="button" href="/login">
              Switch account
            </Link>
          </div>
        </div>
        <div className="nav-tabs" style={{ marginTop: 18 }}>
          {links.map((link) => (
            <Link className="nav-tab" key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </section>
      {children}
    </main>
  );
}
