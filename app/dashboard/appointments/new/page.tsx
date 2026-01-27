'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

// Step Components (Placeholders for now)
import ServiceSelection from '@/components/booking/wizard/service-selection';
import StaffDateSelection from '@/components/booking/wizard/staff-date-selection';
import SlotSelection from '@/components/booking/wizard/slot-selection';
import CustomerForm from '@/components/booking/wizard/customer-form';
import BookingReview from '@/components/booking/wizard/booking-review';

export type BookingState = {
    serviceId: string | null;
    serviceName: string | null;
    servicePrice: number | null;
    staffId: string | null;
    staffName: string | null;
    date: Date | null;
    slot: string | null; // ISO Start Time
    customer: {
        id?: string;
        name: string;
        phone: string;
        email: string;
    } | null;
};

const STEPS = [
    { id: 1, title: 'Select Service' },
    { id: 2, title: 'Select Staff & Date' },
    { id: 3, title: 'Select Time' },
    { id: 4, title: 'Customer Details' },
    { id: 5, title: 'Review & Confirm' },
];

export default function NewAppointmentPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [booking, setBooking] = useState<BookingState>({
        serviceId: null,
        serviceName: null,
        servicePrice: null,
        staffId: null,
        staffName: null,
        date: null,
        slot: null,
        customer: null,
    });

    const updateBooking = (data: Partial<BookingState>) => {
        setBooking(prev => ({ ...prev, ...data }));
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    const previousStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));
    const goToStep = (step: number) => {
        if (step < currentStep) setCurrentStep(step);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/appointments">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">New Appointment</h1>
                    <p className="text-sm text-gray-500">Create a new booking manually</p>
                </div>
            </div>

            {/* Progress Stepper */}
            <div className="flex items-center justify-between px-4 py-4 bg-white border rounded-lg overflow-x-auto">
                {STEPS.map((step) => {
                    const isActive = step.id === currentStep;
                    const isCompleted = step.id < currentStep;

                    return (
                        <div
                            key={step.id}
                            className={`flex flex-col items-center min-w-[100px] ${step.id !== STEPS.length ? 'flex-1' : ''}`}
                        >
                            <div className="flex items-center w-full">
                                <button
                                    onClick={() => goToStep(step.id)}
                                    disabled={!isCompleted}
                                    className={`
                                        relative flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors z-10 mx-auto
                                        ${isActive ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                                            isCompleted ? 'bg-green-600 text-white cursor-pointer hover:bg-green-700' : 'bg-slate-100 text-slate-400'}
                                    `}
                                >
                                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : step.id}
                                </button>
                                {step.id !== STEPS.length && (
                                    <div className={`
                                        hidden md:block h-0.5 w-full -ml-[50%] -mr-[50%] z-0
                                        ${isCompleted ? 'bg-green-600' : 'bg-slate-100'}
                                    `} />
                                )}
                            </div>
                            <span className={`text-xs mt-2 font-medium ${isActive ? 'text-primary' : 'text-slate-500'}`}>
                                {step.title}
                            </span>
                        </div>
                    );
                })}
            </div>

            <Card className="min-h-[400px]">
                <CardContent className="p-6">
                    {currentStep === 1 && (
                        <ServiceSelection
                            selectedId={booking.serviceId}
                            onSelect={(service) => {
                                updateBooking({
                                    serviceId: service.id,
                                    serviceName: service.name,
                                    servicePrice: service.price
                                });
                                nextStep();
                            }}
                        />
                    )}

                    {currentStep === 2 && booking.serviceId && (
                        <StaffDateSelection
                            serviceId={booking.serviceId}
                            date={booking.date}
                            staffId={booking.staffId}
                            onSelect={(data) => {
                                updateBooking(data);
                                nextStep();
                            }}
                        />
                    )}

                    {currentStep === 3 && booking.serviceId && booking.date && (
                        <SlotSelection
                            serviceId={booking.serviceId}
                            staffId={booking.staffId} // Optional
                            date={booking.date}
                            selectedSlot={booking.slot}
                            onSelect={(slot) => {
                                updateBooking({ slot });
                                nextStep();
                            }}
                            onBack={previousStep}
                        />
                    )}

                    {currentStep === 4 && (
                        <CustomerForm
                            customer={booking.customer}
                            onSave={(customer) => {
                                updateBooking({ customer });
                                nextStep();
                            }}
                            onBack={previousStep}
                        />
                    )}

                    {currentStep === 5 && (
                        <BookingReview
                            booking={booking}
                            onBack={previousStep}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
