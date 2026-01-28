'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import StepService from './step-service';
import StepStaff from './step-staff';
import StepDate from './step-date';
import StepDetails from './step-details';

// Booking State Type
export interface BookingData {
    serviceId?: string;
    serviceName?: string;
    servicePrice?: number;
    staffId?: string | null; // null = any
    staffName?: string | null;
    date?: Date;
    slot?: string; // ISO
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
}

interface Tenant {
    id: string;
    name: string;
    currency: string;
    timezone: string;
    slug: string;
    location_photos: string[];
}

const STEPS = {
    SERVICE: 0,
    STAFF: 1,
    DATE: 2,
    DETAILS: 3,
    CONFIRMATION: 4 // Usually redirect or success view
};

export default function BookingContainer({ tenant }: { tenant: Tenant }) {
    const [step, setStep] = useState(STEPS.SERVICE);
    const [data, setData] = useState<BookingData>({});

    const updateData = (newData: Partial<BookingData>) => {
        setData(prev => ({ ...prev, ...newData }));
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => {
        // If coming back from DATE (2), we want to go to SERVICE (0), skipping STAFF (1).
        setStep(prev => {
            if (prev === STEPS.DATE) return STEPS.SERVICE;
            return Math.max(0, prev - 1);
        });
    };

    const renderStep = () => {
        switch (step) {
            case STEPS.SERVICE:
                return (

                    <div className="space-y-6">
                        <StepService
                            tenantId={tenant.id}
                            currency={tenant.currency}
                            value={data.serviceId}
                            onSelect={(service) => {
                                updateData({
                                    serviceId: service.id,
                                    serviceName: service.name,
                                    servicePrice: service.price,
                                    // Reset staff when service changes
                                    staffId: null,
                                    staffName: null
                                });
                            }}
                        />
                        <StepStaff
                            serviceId={data.serviceId!}
                            value={data.staffId}
                            onSelect={(staff) => {
                                updateData({
                                    staffId: staff.id,
                                    staffName: staff.name
                                });
                            }}
                        />
                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={() => setStep(STEPS.DATE)}
                                disabled={!data.serviceId || !data.staffId && data.staffId !== null} // staffId null is valid "Any", but explicitly we might want to ensure they picked even "Any". 
                                // Actually data.staffId initialized as undefined? check state.
                                // In onSelect, we set staffId to match selection.
                                // If they haven't selected staff yet, staffId might be undefined.
                                // StepStaff handles explicit "Any" selection by passing id: null.
                                // So we need to ensure staffId is set (either string or null), but not undefined.
                                className="w-full sm:w-auto h-12 bg-primary-foreground text-primary border-primary-foreground hover:bg-[#343434] hover:text-primary hover:border hover:border-primary-foreground transition-all"
                                style={{ borderRadius: '0.3rem' }}
                            >
                                Continue to Date
                            </Button>
                        </div>
                    </div>
                );
            // Case STEPS.STAFF is now skipped/merged, but we keep the switch case just in case, though it won't be reached.
            case STEPS.STAFF:
                // If somehow we land here, redirect or just show staff? 
                // Let's just make it null or repeat the view? 
                // Better to just ensure we jump to DATE.
                return null;
            case STEPS.DATE:
                return (
                    <StepDate
                        serviceId={data.serviceId!}
                        staffId={data.staffId!}
                        tenantId={tenant.id} // Not used directly in component maybe, but good for context
                        onSelect={(slotData) => {
                            updateData({
                                date: slotData.date,
                                slot: slotData.slot
                            });
                            nextStep();
                        }}
                        onBack={prevStep}
                        timezone={tenant.timezone}
                    />
                );
            case STEPS.DETAILS:
                return (
                    <StepDetails
                        data={data}
                        tenantId={tenant.id}
                        onBack={prevStep}
                        onSubmit={(customerData) => {
                            updateData(customerData);
                            // Initiate API call here or in component?
                            // Component usually calls API and redirects on success.
                        }}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-card flex flex-col gap-4 align-center justify-center border border-2 border-primary overflow-hidden min-h-[400px]" style={{ borderRadius: '1rem' }}>

            <div className="p-4 sm:p-6">
                {renderStep()}
            </div>
        </div>
    );
}
