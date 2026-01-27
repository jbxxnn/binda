'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2, Phone, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    created_at: string;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadCustomers();
    }, []);

    useEffect(() => {
        if (!search) {
            setFilteredCustomers(customers);
        } else {
            const lowerSearch = search.toLowerCase();
            setFilteredCustomers(
                customers.filter(
                    (c) =>
                        c.name.toLowerCase().includes(lowerSearch) ||
                        (c.phone && c.phone.includes(search)) ||
                        (c.email && c.email.toLowerCase().includes(lowerSearch))
                )
            );
        }
    }, [search, customers]);

    async function loadCustomers() {
        try {
            const response = await fetch('/api/customers');
            if (response.ok) {
                const data = await response.json();
                setCustomers(data);
                setFilteredCustomers(data);
            }
        } catch (error) {
            console.error('Failed to load customers:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this customer?')) return;

        try {
            const response = await fetch(`/api/customers/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setCustomers(customers.filter(c => c.id !== id));
            } else {
                alert('Failed to delete customer');
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
        }
    }

    if (loading) {
        return <div className="p-8 text-center">Loading customers...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Customers</h1>
                <Link href="/dashboard/customers/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Customer
                    </Button>
                </Link>
            </div>

            <div className="flex items-center space-x-2">
                <Input
                    placeholder="Search by name, phone or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCustomers.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                        No customers found.
                    </div>
                ) : (
                    filteredCustomers.map((customer) => (
                        <Card key={customer.id} className="overflow-hidden">
                            <CardContent className="p-0">
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <User className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg">{customer.name}</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Joined {new Date(customer.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-2 text-sm">
                                        <div className="flex items-center text-gray-600">
                                            <Phone className="h-4 w-4 mr-2" />
                                            {customer.phone}
                                        </div>
                                        {customer.email && (
                                            <div className="flex items-center text-gray-600">
                                                <Mail className="h-4 w-4 mr-2" />
                                                {customer.email}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gray-50 px-6 py-3 flex justify-end gap-2 border-t">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/dashboard/customers/${customer.id}/edit`}>
                                            <Edit className="h-4 w-4 mr-1" /> Edit
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDelete(customer.id)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" /> Delete
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
