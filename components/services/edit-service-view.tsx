'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ServiceForm from './service-form';
import StaffAssignment from './staff-assignment';

interface EditServiceViewProps {
    service: any;
}

export default function EditServiceView({ service }: EditServiceViewProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (formData: any) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/services/${service.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update service');
            }

            // Optionally show success toast
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/services">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Edit Service</h1>
            </div>

            <ServiceForm
                initialData={service}
                onSubmit={handleSubmit}
                loading={loading}
                error={error}
                title="Service Details"
            />

            {/* Staff Assignment Section */}
            <StaffAssignment serviceId={service.id} />
        </div>
    );
}
