import BookingContainer from '@/components/public-booking/booking-container';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import TenantContainer from '@/components/public-booking/tenant-container';

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = createAdminClient();

    const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, currency, timezone, slug, location_photos')
        .eq('slug', slug)
        .single();

    if (!tenant) notFound();

    return (
        <>
            <TenantContainer tenant={tenant} />
            <BookingContainer tenant={tenant} />
        </>
    );
}
