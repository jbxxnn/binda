'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Service {
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
    is_active: boolean;
}

export default function ServicesPage() {
    const router = useRouter();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadServices();
    }, []);

    async function loadServices() {
        try {
            const response = await fetch('/api/services');
            if (response.ok) {
                const data = await response.json();
                setServices(data);
            }
        } catch (error) {
            console.error('Failed to load services:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this service?')) return;

        try {
            const response = await fetch(`/api/services/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setServices(services.filter(s => s.id !== id));
            } else {
                alert('Failed to delete service');
            }
        } catch (error) {
            console.error('Error deleting service:', error);
        }
    }

    if (loading) {
        return <div className="p-8 text-center">Loading services...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Services</h1>
                <Link href="/dashboard/services/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Service
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {services.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                        No services found. Create your first service to get started.
                    </div>
                ) : (
                    services.map((service) => (
                        <Card key={service.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-medium">
                                    {service.name}
                                </CardTitle>
                                <div className={`w-2 h-2 rounded-full ${service.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₦{service.price.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {service.duration_minutes} mins
                                </p>
                                <div className="flex gap-2 mt-4">
                                    <Link href={`/dashboard/services/${service.id}`} className="w-full">
                                        <Button variant="outline" size="sm" className="w-full">
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(service.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
