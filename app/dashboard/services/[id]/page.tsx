import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import EditServiceView from '@/components/services/edit-service-view';

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: service, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !service) {
        notFound();
    }

    return <EditServiceView service={service} />;
}
