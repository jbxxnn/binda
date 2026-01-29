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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Staff {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    is_active: boolean;
}

export default function StaffPage() {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStaff();
    }, []);

    async function loadStaff() {
        try {
            const response = await fetch('/api/staff');
            if (response.ok) {
                const data = await response.json();
                setStaffList(data);
            }
        } catch (error) {
            console.error('Failed to load staff:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this staff member?')) return;

        try {
            const response = await fetch(`/api/staff/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setStaffList(staffList.filter(s => s.id !== id));
            } else {
                alert('Failed to delete staff member');
            }
        } catch (error) {
            console.error('Error deleting staff:', error);
        }
    }



    return (
        <div className="space-y-6 max-w-7xl w-full mx-auto py-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Staff</h1>
                <Link href="/dashboard/staff/new">
                    <Button className='bg-primary-foreground text-primary hover:bg-primary-foreground hover:text-primary rounded-full'>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Staff
                    </Button>
                </Link>
            </div>

            <div className="rounded-md border overflow-hidden" style={{ borderRadius: '1rem' }}>
                <Table className='bg-card'>
                    <TableHeader className='bg-accent'>
                        <TableRow>
                            <TableHead className="w-[30%]">Name</TableHead>
                            <TableHead>Contact</TableHead>
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
                                        <div className="space-y-2">
                                            <Skeleton className="h-3 w-[180px]" />
                                            <Skeleton className="h-3 w-[120px]" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-[60px]" />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Skeleton className="h-8 w-20" />
                                            <Skeleton className="h-8 w-8" />
                                            <Skeleton className="h-8 w-8" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : staffList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No staff found. Add your team members to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            staffList.map((staff) => (
                                <TableRow key={staff.id}>
                                    <TableCell className="font-medium">{staff.name}</TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {staff.email && <div>{staff.email}</div>}
                                            {staff.phone && <div className="text-muted-foreground text-xs">{staff.phone}</div>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${staff.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {staff.is_active ? 'Active' : 'Inactive'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/dashboard/staff/${staff.id}/schedule`}>
                                                <Button variant="default" size="sm" className="rounded-full h-8 bg-primary-foreground text-primary hover:bg-primary-foreground hover:text-primary">
                                                    <Calendar className="mr-2 h-3.5 w-3.5" />
                                                    Schedule
                                                </Button>
                                            </Link>
                                            <Link href={`/dashboard/staff/${staff.id}/edit`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(staff.id)}
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
