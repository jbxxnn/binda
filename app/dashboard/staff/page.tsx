'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

    if (loading) {
        return <div className="p-8 text-center">Loading staff...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Staff</h1>
                <Link href="/dashboard/staff/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Staff
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {staffList.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                        No staff found. Add your team members to get started.
                    </div>
                ) : (
                    staffList.map((staff) => (
                        <Card key={staff.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-medium">
                                    {staff.name}
                                </CardTitle>
                                <div className={`w-2 h-2 rounded-full ${staff.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-gray-500 mb-4 h-12">
                                    {staff.email && <div>{staff.email}</div>}
                                    {staff.phone && <div>{staff.phone}</div>}
                                </div>

                                <div className="flex gap-2">
                                    <Link href={`/dashboard/staff/${staff.id}/schedule`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full">
                                            <Calendar className="mr-2 h-4 w-4" />
                                            Schedule
                                        </Button>
                                    </Link>
                                    <Link href={`/dashboard/staff/${staff.id}/edit`}>
                                        <Button variant="outline" size="sm">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(staff.id)}
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
