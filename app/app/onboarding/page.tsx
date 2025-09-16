"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const [businessName, setBusinessName] = useState("");
  const [businessSlug, setBusinessSlug] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }
      
      setUser(user);
      
      // Check if user already has a business
      const { data: businesses } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id);
      
      if (businesses && businesses.length > 0) {
        router.push("/app/dashboard");
        return;
      }
    };
    
    checkUser();
  }, [router]);

  // Generate business slug from business name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  };

  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value);
    const newSlug = generateSlug(value);
    setBusinessSlug(newSlug);
    if (newSlug) {
      checkSlugAvailability(newSlug);
    }
  };

  const handleBusinessSlugChange = (value: string) => {
    setBusinessSlug(value);
    if (value) {
      checkSlugAvailability(value);
    }
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug) {
      setSlugAvailable(null);
      return;
    }

    setIsCheckingSlug(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('businesses')
        .select('slug')
        .eq('slug', slug)
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows found, slug is available
        setSlugAvailable(true);
      } else if (error) {
        console.error('Error checking slug:', error);
        setSlugAvailable(null);
      } else {
        // Slug exists
        setSlugAvailable(false);
      }
    } catch (error) {
      console.error('Error checking slug:', error);
      setSlugAvailable(null);
    } finally {
      setIsCheckingSlug(false);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!businessName.trim()) {
      setError("Business name is required");
      setIsLoading(false);
      return;
    }

    if (!businessSlug.trim()) {
      setError("Business slug is required");
      setIsLoading(false);
      return;
    }

    if (slugAvailable === false) {
      setError("This business URL is already taken. Please choose a different one.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/create-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName: businessName.trim(),
          businessSlug: businessSlug.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create business');
      }

      console.log('Business created successfully:', result.business);

      // Redirect to dashboard
      router.push("/app/dashboard");
    } catch (error) {
      console.error('Business creation error:', error);
      setError(error instanceof Error ? error.message : "Failed to create business");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to Binda! 🎉</CardTitle>
            <CardDescription>
              Let&apos;s set up your business account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="My Awesome Business"
                  required
                  value={businessName}
                  onChange={(e) => handleBusinessNameChange(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="businessSlug">Business URL *</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">binda.app/</span>
                  <Input
                    id="businessSlug"
                    type="text"
                    placeholder="my-awesome-business"
                    required
                    value={businessSlug}
                    onChange={(e) => handleBusinessSlugChange(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  {isCheckingSlug && (
                    <span className="text-xs text-muted-foreground">Checking availability...</span>
                  )}
                  {slugAvailable === true && (
                    <span className="text-xs text-green-600">✓ Available</span>
                  )}
                  {slugAvailable === false && (
                    <span className="text-xs text-red-600">✗ Already taken</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  This will be your unique business URL
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ownerName">Your Name *</Label>
                <Input
                  id="ownerName"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>
              
              {error && <p className="text-sm text-red-500">{error}</p>}
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating your business..." : "Create Business"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
