'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

interface Props {
    customer: {
        name: string;
        phone: string;
        email: string;
    } | null;
    onSave: (data: { name: string; phone: string; email: string }) => void;
    onBack: () => void;
}

export default function CustomerForm({ customer, onSave, onBack }: Props) {
    const [name, setName] = useState(customer?.name || '');
    const [phone, setPhone] = useState(customer?.phone || '');
    const [email, setEmail] = useState(customer?.email || '');

    // Future: Add search for existing customer

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, phone, email });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-6">
                <Button type="button" variant="outline" size="sm" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold text-lg">Customer Details</h3>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                        id="phone"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="08012345678"
                        required
                    />
                    <p className="text-xs text-gray-500">We'll use this to check only.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="john@example.com"
                    />
                </div>
            </div>

            <Button type="submit" className="w-full mt-4">
                Review Booking
            </Button>
        </form>
    );
}
