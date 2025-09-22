"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./logout-button";
import { User } from "@supabase/supabase-js";

export function ClientAuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  return user ? (
    <div className="flex items-center gap-4">
      {/* Hey, {user.email}! */}
      <Button asChild size="sm" variant={"default"} className="bg-brand-mint text-brand-hunter hover:bg-brand-mint/90 rounded-sm">
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"} className="text-brand-hunter hover:text-brand-mint rounded-sm">
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"} className="bg-brand-mint text-brand-hunter hover:bg-brand-mint/90 rounded-sm">
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
