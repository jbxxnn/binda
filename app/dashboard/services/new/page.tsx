'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ServiceForm from '@/components/services/service-form';

export default function NewServicePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (formData: any) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/services', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create service');
            }

            router.push('/dashboard/services');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto space-y-6 py-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/services">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-lg font-bold">Add New Service</h1>
            </div>

            <ServiceForm
                onSubmit={handleSubmit}
                loading={loading}
                error={error}
                showTitle={false}
            />
        </div>
    );
}
