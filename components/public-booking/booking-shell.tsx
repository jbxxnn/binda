'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingShellProps {
    children: React.ReactNode;
    header: React.ReactNode;
    tenantName: string;
    serviceCount?: number;
}

export default function BookingShell({
    children,
    header,
    tenantName,
    serviceCount = 57
}: BookingShellProps) {
    const [isBooking, setIsBooking] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-6 sm:py-12 bg-background overflow-hidden">
            <AnimatePresence mode="wait">
                {!isBooking ? (
                    <motion.div
                        key="landing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full flex flex-col items-center"
                    >
                        {/* Header (TenantContainer) */}
                        <div className="w-full max-w-7xl">
                            {header}
                        </div>


                    </motion.div>
                ) : (
                    <motion.div
                        key="booking"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-7xl px-4 flex flex-col"
                    >
                        <div className="w-full max-w-4xl mx-auto mt-8 flex flex-col md:flex-row gap-8">
                            <div className="w-full">
                                {children}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Bar */}
            <AnimatePresence>
                {!isBooking && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        transition={{ duration: 0.3 }}
                        className='w-full px-4 border-t border-slate-200 flex flex-row justify-between items-center fixed bottom-0 left-0 right-0 z-50 bg-white'
                        style={{ height: '5rem' }}
                    >
                        <p>{serviceCount} services available</p>
                        <Button
                            onClick={() => setIsBooking(true)}
                            className='bg-primary-foreground text-primary rounded-full'
                        >
                            Book Now
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
