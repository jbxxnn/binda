"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    // Validation
    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `https://app.binda.app/onboarding`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Redirect to success page
        router.push("/auth/sign-up-success");
      } else {
        throw new Error('No user data returned from authentication');
      }
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      setError(error instanceof Error ? error.message : "An error occurred during sign up");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6 space-y-2">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold text-brand-hunter">Welcome to Binda</h1>
                <p className="text-muted-foreground text-sm">
                  Please enter your details to sign up. You&apos;ll be able to create your business account later.
                </p>
              </div>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-brand-snowman border-brand-hunter rounded-sm focus-visible:ring-brand-hunter focus-visible:ring-1 focus-visible:ring-offset-0 placeholder:text-brand-hunter placeholder:text-sm h-[3rem]"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-brand-snowman border-brand-hunter rounded-sm focus-visible:ring-brand-hunter focus-visible:ring-1 focus-visible:ring-offset-0 placeholder:text-brand-hunter placeholder:text-sm h-[3rem]"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  placeholder="********"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="bg-brand-snowman border-brand-hunter rounded-sm focus-visible:ring-brand-hunter focus-visible:ring-1 focus-visible:ring-offset-0 placeholder:text-brand-hunter placeholder:text-sm h-[3rem]"
                />
              </div>
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <Button type="submit" className="w-full bg-brand-hunter rounded-sm text-sm h-[3rem]" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4 text-brand-hunter text-sm">
                Sign in
              </Link>
            </div>
            </div>
          </form>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#" className="text-brand-hunter underline">Terms of Service</a>{" "}
        and <a href="#" className="text-brand-hunter underline">Privacy Policy</a>.
      </div>
    </div>
  );
}
