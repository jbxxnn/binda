import { createClient } from "@/lib/supabase/server";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AuthButton } from "@/components/auth-button";
import Link from "next/link";
import { redirect } from "next/navigation";

export async function DashboardHeader() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        // This redirect happens inside the Suspense boundary, 
        // so it might trigger a client-side navigation or a full reload depending on how Next.js handles it.
        // Ideally, middleware protects the route so this is just a fallback.
        return redirect("/auth/login");
    }

    // Ensure user has a tenant
    const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!userData?.tenant_id) {
        return redirect("/onboarding");
    }

    return (
        <div className="flex items-center gap-4">

            {/* <ThemeSwitcher /> */}
            <AuthButton />
        </div>
    );
}
