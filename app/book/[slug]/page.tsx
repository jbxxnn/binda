import BookingContainer from '@/components/public-booking/booking-container';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = createAdminClient();

    const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, currency, timezone')
        .eq('slug', slug)
        .single();

    if (!tenant) notFound();

    return <BookingContainer tenant={tenant} />;
}
