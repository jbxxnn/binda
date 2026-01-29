'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StaffFormProps {
    initialData?: {
        name: string;
        email: string;
        phone: string;
        is_active: boolean;
    };
    onSubmit: (data: any) => Promise<void>;
    loading: boolean;
    error: string | null;
    title?: string;
}

export default function StaffForm({
    initialData,
    onSubmit,
    loading,
    error,
    title = 'Staff Details',
}: StaffFormProps) {
    const [formData, setFormData] = useState(initialData || {
        name: '',
        email: '',
        phone: '',
        is_active: true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            required
                            className='border border-2 border-gray-300'
                            style={{ borderRadius: '0.5rem', height: '50px' }}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Jane Doe"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            className='border border-2 border-gray-300'
                            style={{ borderRadius: '0.5rem', height: '50px' }}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="jane@example.com"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            type="tel"
                            className='border border-2 border-gray-300'
                            style={{ borderRadius: '0.5rem', height: '50px' }}
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+234..."
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <Label htmlFor="is_active">Active Staff Member</Label>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="rounded-full bg-primary-foreground text-white hover:bg-primary-foreground hover:text-primary" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Staff Member'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
