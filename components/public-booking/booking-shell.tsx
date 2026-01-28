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
        <div className="min-h-screen flex flex-col items-center justify-center py-6 sm:py-12 overflow-hidden bg-[linear-gradient(-45deg,#FFDBD0,#FFD1E2,#D5F4FF,#DCFFF7)] bg-[length:400%_400%] animate-gradient">
            <AnimatePresence mode="wait">
                {!isBooking ? (
                    <motion.div
                        key="landing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full flex flex-col items-center"
                        style={{ marginBottom: '4rem' }}
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
                        className='w-full px-4 border-t border-slate-200 flex flex-row justify-between items-center fixed inset-x-0 bottom-0 left-0 right-0 z-50 bg-white'
                        style={{
                            height: '5rem',
                            paddingBottom: 'env(safe-area-inset-bottom)',
                            transform: 'translateZ(0)',
                        }}
                    >
                        <p>{serviceCount} services available</p>
                        <Button
                            onClick={() => {
                                setIsBooking(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className='bg-primary-foreground hover:bg-primary-foreground hover:text-primary text-primary rounded-full'
                        >
                            Book Now
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
