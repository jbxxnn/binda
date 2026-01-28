import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import TenantContainer from '@/components/public-booking/tenant-container';

import BookingShell from '@/components/public-booking/booking-shell';

// Force dynamic rendering since we depend on route params and Admin access
export const dynamic = 'force-dynamic';

// Generate metadata dynamically based on tenant
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const supabase = createAdminClient();

    const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('slug', slug)
        .single();

    return {
        title: tenant ? `Book | ${tenant.name}` : 'Booking Not Found',
    };
}

export default async function PublicBookingLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const supabase = createAdminClient();

    const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, name, slug, currency, timezone, location_photos, about_us, address, latitude, longitude')
        .eq('slug', slug)
        .single();

    if (error || !tenant) {
        notFound();
    }

    return (
        <BookingShell
            tenantName={tenant.name}
            header={<TenantContainer tenant={tenant} />}
        >
            {children}
        </BookingShell>
    );
}
