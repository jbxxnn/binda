'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
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

    return (
        <div className="space-y-6 max-w-7xl w-full mx-auto py-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Services</h1>
                <Link href="/dashboard/services/new">
                    <Button className='bg-primary-foreground text-primary hover:bg-primary-foreground hover:text-primary rounded-full'>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Service
                    </Button>
                </Link>
            </div>

            <div className="rounded-md border overflow-hidden" style={{ borderRadius: '1rem' }}>
                <Table className='bg-card'>
                    <TableHeader className='bg-accent'>
                        <TableRow>
                            <TableHead className="w-[40%]">Name</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <Skeleton className="h-4 w-[150px]" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-[80px]" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-[80px]" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-[60px]" />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Skeleton className="h-8 w-8" />
                                            <Skeleton className="h-8 w-8" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : services.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No services found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            services.map((service) => (
                                <TableRow key={service.id}>
                                    <TableCell className="font-medium">{service.name}</TableCell>
                                    <TableCell>{service.duration_minutes} mins</TableCell>
                                    <TableCell>₦{service.price.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${service.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {service.is_active ? 'Active' : 'Inactive'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/dashboard/services/${service.id}`}>
                                                <Button variant="ghost" size="icon">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(service.id)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
