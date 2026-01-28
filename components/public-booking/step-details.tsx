'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { BookingData } from './booking-container';
import { DateTime } from 'luxon';
import Link from 'next/link';

import { createBooking } from '@/app/actions/booking';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Props {
    data: BookingData;
    onBack: () => void;
    onSubmit: (customerData: any) => void;
    tenantId: string; // Needed for server action
}

export default function StepDetails({ data, onBack, onSubmit, tenantId }: Props) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState<'venue' | 'online'>('venue');

    const [loading, setLoading] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // New Server Action Call
            const result = await createBooking({
                tenantId: tenantId,
                serviceId: data.serviceId!,
                staffId: data.staffId!,
                startTime: data.slot!, // Should be validated as not null before this step
                customerName: name,
                customerPhone: phone,
                customerEmail: email,
                paymentMethod: paymentMethod,
                callbackUrl: `${window.location.origin}/book/${data.serviceId}/success` // Placeholder callback
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            // Handle Payment Redirect
            if (result.status === 'payment_pending' && result.paymentUrl) {
                window.location.href = result.paymentUrl;
                return;
            }

            // Success (Pay at Venue)
            setCompleted(true);
            onSubmit({ customerName: name, customerPhone: phone, customerEmail: email });

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Booking failed');
        } finally {
            setLoading(false);
        }
    };

    if (completed) {
        return (
            <div className="text-center py-12 space-y-4">
                <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Booking Confirmed!</h2>
                <p className="text-slate-500 max-w-xs mx-auto">
                    Thanks {name}, your appointment for {data.serviceName} has been booked.
                    {paymentMethod === 'venue' && <span className="block mt-2 font-medium text-amber-600">Please pay at the venue.</span>}
                </p>
                <div className="pt-8">
                    <Button variant="default" className="bg-primary-foreground text-primary hover:bg-primary-foreground hover:text-primary" style={{ borderRadius: '10rem' }} onClick={() => window.location.reload()}>Book Another</Button>
                </div>
            </div>
        );
    }

    const dateLabel = data.date && data.slot
        ? DateTime.fromISO(data.slot).toFormat('MMM dd yyyy, h:mm a')
        : 'Selected Time';

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="-ml-3 rounded-full hover:text-primary-foreground" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-sm font-semibold text-slate-800">Change date or time</h2>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-1 mb-6 border flex flex-col gap-2" style={{ borderRadius: '1rem' }}>
                <div>
                    <p className="font-semibold text-lg text-slate-900">{data.serviceName} ({data.servicePrice ? `₦${data.servicePrice.toLocaleString()}` : 'Price TBD'})</p>
                    <p className="text-slate-500">{dateLabel}</p>
                </div>
                <p className="text-slate-800 bg-slate-200 p-2" style={{ borderRadius: '0.3rem' }}>with {data.staffName || 'Professional'}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-8">
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-primary-foreground font-mono">Full Name</Label>
                    <Input
                        id="name"
                        className="text-base text-primary-foreground font-grotesk border border-2 border-gray-300 h-12"
                        style={{
                            borderRadius: '0.5rem',
                            height: '55px'
                        }}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder="Enter your full name"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-primary-foreground font-mono">Phone Number</Label>
                    <Input
                        id="phone"
                        className="text-base text-primary-foreground font-grotesk border border-2 border-gray-300 h-12"
                        style={{
                            borderRadius: '0.5rem',
                            height: '55px'
                        }}
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                        placeholder="Enter your phone number"
                    />
                </div>

                {/* <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-primary-foreground font-mono">Email (Optional)</Label>
                    <Input
                        id="email"
                        type="email"
                        className="text-sm text-primary-foreground font-grotesk bg-primary h-12"
                        style={{
                            borderRadius: '0.3rem'
                        }}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                    />
                </div> */}

                {/* Payment Method Selection */}
                <div className="space-y-3 pt-8">
                    <Label className="text-sm font-medium text-primary-foreground font-mono">Payment Method</Label>
                    <RadioGroup
                        value={paymentMethod}
                        onValueChange={(val: 'venue' | 'online') => setPaymentMethod(val)}
                        className="grid grid-cols-2 gap-4"
                    >
                        <div>
                            <RadioGroupItem value="venue" id="venue" className="peer sr-only" />
                            <Label
                                htmlFor="venue"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-primary bg-transparent p-2 hover:bg-slate-50 peer-data-[state=checked]:border-primary-foreground peer-data-[state=checked]:bg-primary-foreground peer-data-[state=checked]:text-primary cursor-pointer"
                                style={{
                                    borderRadius: '0.3rem'
                                }}
                            >
                                <span className="mb-1 text-sm font-medium">Pay at Venue</span>
                                <span className="text-xs">Cash/Transfer</span>
                            </Label>
                        </div>
                        <div className="opacity-50">
                            <RadioGroupItem value="online" id="online" className="peer sr-only" disabled />
                            <Label
                                htmlFor="online"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-2 cursor-not-allowed"
                                style={{
                                    borderRadius: '0.3rem'
                                }}
                            >
                                <span className="mb-1 text-sm font-medium">Pay Online</span>
                                <span className="text-xs">(coming soon)</span>
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                {error && (
                    <div className="text-red-500 text-sm p-3 bg-red-50 rounded">
                        {error}
                    </div>
                )}

                <Button type="submit" className="w-full h-12 text-md mt-8 bg-primary-foreground text-primary hover:bg-[#343434] hover:text-primary" style={{ borderRadius: '0.3rem' }} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                    {paymentMethod === 'online' ? `Pay ₦${data.servicePrice?.toLocaleString() || '...'}` : 'Confirm Booking'}
                </Button>
            </form>
        </div>
    );
}
