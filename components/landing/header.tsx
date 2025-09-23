"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { ClientAuthButton } from "@/components/client-auth-button";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: "Features", href: "/#features" },
    { name: "Pricing", href: "/#pricing" },
    { name: "Testimonials", href: "/#testimonials" },
    { name: "FAQ", href: "/#faq" }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-brand-underworld/95 backdrop-blur-sm border-b border-brand-hunter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Image
                src="/BINDA.png"
                alt="Binda Logo"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-brand-tropical hover:text-brand-mint transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* <Link href="/auth/login">
              <Button variant="ghost" className="text-brand-tropical hover:text-brand-mint">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-brand-mint text-brand-hunter hover:bg-brand-mint/90 rounded-sm">
                Get Started
              </Button>
            </Link> */}
            <ClientAuthButton />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-brand-tropical hover:text-brand-mint"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden min-h-screen">
            <div className="px-2 pt-4 flex flex-col justify-between pb-3 space-y-1 border-t border-brand-hunter h-full">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 text-brand-tropical hover:text-brand-mint transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 space-y-2">
                <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full text-brand-tropical hover:text-brand-mint">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/sign-up" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-brand-mint text-brand-hunter hover:bg-brand-mint/90 rounded-sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
