'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if user has a tenant, redirect to onboarding if not
    const checkTenant = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      // If user doesn't have a tenant, redirect to onboarding
      if (!userProfile?.tenant_id) {
        router.push('/onboarding');
      }
    };

    checkTenant();
  }, [router, supabase]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Thank you for signing up!
              </CardTitle>
              <CardDescription>Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You&apos;ve successfully signed up. Please check your email to
                confirm your account before signing in.
              </p>
              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link href="/auth/login">Go to Login</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/onboarding">Set Up Your Business</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
