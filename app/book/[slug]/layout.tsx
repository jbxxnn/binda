import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';

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
        .select('id, name, slug, currency')
        .eq('slug', slug)
        .single();

    if (error || !tenant) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-6 sm:py-12 bg-background">
            <div className="w-full max-w-7xl px-4 flex flex-col">
                <div className="mb-8 text-start">
                    {/* <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        {tenant.name}
                    </h1> */}
                </div>
                <div className='w-full max-w-4xl mx-auto mt-8 flex flex-col md:flex-row gap-8'>
                    <div className='w-full md:w-1/2 relative'>
                        <div className='bg-primary text-primary-foreground p-2 absolute top-[-5%] left-0 shadow-lg font-mono' style={{ borderRadius: '0.3rem' }}>{tenant.name}</div>
                        <div className='w-full max-h-[400px] h-full bg-primary'>
                            {/* <Image src='/opengraph-image.png' alt={tenant.name} width={100} height={100} /> */}
                        </div>
                    </div>
                    <div className="w-full md:w-1/2">
                        {children}
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-slate-400">
                    Powered by Binda
                </div>
            </div>
        </div>
    );
}
