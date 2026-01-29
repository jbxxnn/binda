'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import StaffForm from '@/components/staff/staff-form';
// import { useUtils } from '@/lib/utils'; // Assuming useUtils handles params unwrapping, otherwise handle it directly

export default function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [staff, setStaff] = useState<any>(null);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const { id } = await params;
                const response = await fetch(`/api/staff/${id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch staff details');
                }
                const data = await response.json();
                setStaff(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                // Could retry or redirect
            } finally {
                setInitialLoading(false);
            }
        };

        fetchStaff();
    }, [params]);

    const handleSubmit = async (formData: any) => {
        setLoading(true);
        setError(null);

        try {
            const { id } = await params;
            const response = await fetch(`/api/staff/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update staff member');
            }

            router.push('/dashboard/staff');
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 py-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" disabled>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="border rounded-xl p-6 space-y-6">
                    <div className="space-y-2">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                        <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                </div>
            </div>
        );
    }

    if (!staff && !initialLoading) {
        return <div className="p-8 text-center text-red-500">Staff member not found.</div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 py-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/staff">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Edit Staff Member</h1>
            </div>

            <StaffForm
                initialData={staff}
                onSubmit={handleSubmit}
                loading={loading}
                error={error}
                title="Staff Details"
            />
        </div>
    );
}
