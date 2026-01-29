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
import { Plus, Edit, Trash2, Search, User, Phone, Mail } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
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
                const newCustomers = customers.filter(c => c.id !== id);
                setCustomers(newCustomers);
                // Filter will automatically update via useEffect, but to be instant:
                if (!search) setFilteredCustomers(newCustomers);
            } else {
                alert('Failed to delete customer');
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
        }
    }

    return (
        <div className="space-y-6 max-w-7xl w-full mx-auto py-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Customers</h1>
                <Link href="/dashboard/customers/new">
                    <Button className='bg-primary-foreground text-primary hover:bg-primary-foreground hover:text-primary rounded-full'>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Customer
                    </Button>
                </Link>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name, phone or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-white"
                />
            </div>

            <div className="rounded-md border overflow-hidden" style={{ borderRadius: '1rem' }}>
                <Table className='bg-card'>
                    <TableHeader className='bg-accent'>
                        <TableRow>
                            <TableHead className="w-[30%]">Name</TableHead>
                            <TableHead>Contact Info</TableHead>
                            <TableHead>Joined Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-9 w-9 rounded-full" />
                                            <div className="space-y-1">
                                                <Skeleton className="h-4 w-[120px]" />
                                                <Skeleton className="h-3 w-[80px]" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <Skeleton className="h-4 w-[100px]" />
                                            <Skeleton className="h-3 w-[140px]" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-[100px]" />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Skeleton className="h-8 w-8" />
                                            <Skeleton className="h-8 w-8" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : filteredCustomers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No customers found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCustomers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <User className="h-4 w-4 text-primary-foreground" />
                                            </div>
                                            <div className="font-medium">{customer.name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3 w-3" />
                                                {customer.phone}
                                            </div>
                                            {customer.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3 w-3" />
                                                    {customer.email}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(customer.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* <Link href={`/dashboard/customers/${customer.id}/edit`}>
                                                <Button variant="ghost" size="icon">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link> */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(customer.id)}
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
