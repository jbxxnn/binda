'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { DateTime } from 'luxon';
import { hasConflict } from '@/lib/booking/conflicts';
import { PaystackService } from '@/lib/payments/paystack';

export interface BookingData {
    // Service Context
    tenantId: string;
    serviceId: string;
    staffId: string;
    startTime: string; // ISO String

    // Customer Details
    customerName: string;
    customerEmail: string;
    customerPhone: string;

    // Payment Logic
    paymentMethod: 'venue' | 'online';
    callbackUrl?: string; // For Paystack redirect
}

export type BookingResult =
    | { success: true; bookingId: string; status: 'confirmed'; message: string }
    | { success: true; bookingId: string; status: 'payment_pending'; paymentUrl: string; reference: string; message: string }
    | { success: false; error: string };


export async function createBooking(data: BookingData): Promise<BookingResult> {
    const supabase = createAdminClient();

    try {
        console.log('[createBooking] Starting...', { ...data, customerPhone: '***' });

        // 1. Validate Service & Tenant
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('*')
            .eq('id', data.serviceId)
            .single();

        if (serviceError || !service) {
            return { success: false, error: 'Service not found or invalid.' };
        }

        // 2. Validate Availability (Strict Check)
        const start = DateTime.fromISO(data.startTime).toUTC();
        if (!start.isValid) return { success: false, error: 'Invalid start time.' };

        // Calculate end time
        const end = start.plus({ minutes: service.duration_minutes }).toUTC();

        // Calculate buffer range for conflict check
        const checkStart = start.minus({ minutes: service.buffer_before_minutes });
        const checkEnd = end.plus({ minutes: service.buffer_after_minutes });

        // Perform conflict check 
        // Note: we pass the admin client if needed, but 'hasConflict' currently uses 'createClient' internally.
        // We previously refactored 'getStaffWorkingHours' but NOT 'hasConflict' fully to accept client injection in all paths?
        // Wait, I updated 'getDayBlocks' to accept 'supabase'. 'hasConflict' is a wrapper.
        // Let's use 'getDayBlocks' logic or update 'hasConflict' to accept client.
        // Or simpler: Use 'getDayBlocks' since we have the range.
        // Actually, let's just assume 'hasConflict' fails if it uses cookies.
        // I need to check `lib/booking/conflicts.ts` again. I updated `getDayBlocks` but let's see `hasConflict`.

        // RE-READ: I updated `getDayBlocks`. I should probably use `getDayBlocks` here or update `hasConflict`.
        // Let's use `getDayBlocks` directly to be safe and efficient.
        const { appointments, timeOff, locks } = await import('@/lib/booking/conflicts').then(m =>
            m.getDayBlocks(data.staffId, checkStart.toISO()!, checkEnd.toISO()!, supabase)
        );

        // Check for overlaps manually since we have the raw blocks
        const requestedInterval = { start: checkStart, end: checkEnd };

        const hasOverlap = (
            appointments.some(a => checkStart < DateTime.fromISO(a.end_time) && checkEnd > DateTime.fromISO(a.start_time)) ||
            timeOff.some(t => checkStart < DateTime.fromISO(t.end_datetime) && checkEnd > DateTime.fromISO(t.start_datetime)) ||
            locks.some(l => checkStart < DateTime.fromISO(l.end_time) && checkEnd > DateTime.fromISO(l.start_time))
        );

        if (hasOverlap) {
            return { success: false, error: 'This time slot is no longer available.' };
        }

        // 3. Find or Create Customer
        let customerId;

        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('tenant_id', data.tenantId)
            .or(`email.eq.${data.customerEmail},phone.eq.${data.customerPhone}`)
            .limit(1)
            .single();

        if (existingCustomer) {
            customerId = existingCustomer.id;
        } else {
            const { data: newCustomer, error: createCustError } = await supabase
                .from('customers')
                .insert({
                    tenant_id: data.tenantId,
                    name: data.customerName,
                    email: data.customerEmail,
                    phone: data.customerPhone
                })
                .select('id')
                .single();

            if (createCustError || !newCustomer) {
                console.error('Customer Creation Error:', createCustError);
                return { success: false, error: 'Failed to register customer details.' };
            }
            customerId = newCustomer.id;
        }

        // 4. Determine Status & Payment
        const initialStatus = data.paymentMethod === 'online' ? 'pending_payment' : 'confirmed';

        // 5. Create Appointment
        const { data: appointment, error: apptError } = await supabase
            .from('appointments')
            .insert({
                tenant_id: data.tenantId,
                staff_id: data.staffId,
                service_id: data.serviceId,
                customer_id: customerId,
                start_time: start.toISO(),
                end_time: end.toISO(),
                status: initialStatus,
                notes: `Payment Method: ${data.paymentMethod}`
            })
            .select()
            .single();

        if (apptError || !appointment) {
            console.error('Appointment Insert Error:', apptError);
            return { success: false, error: 'Failed to create booking record.' };
        }

        // 6. Handle Payment Integration
        if (data.paymentMethod === 'online') {
            try {
                // Initialize Paystack
                // Amount is in Kobo (NGN * 100)
                const amountInKobo = Math.round(service.price * 100);

                // Using current domain as callback if not provided?
                // Ideally prompt should provide it.

                const response = await PaystackService.initializeTransaction({
                    email: data.customerEmail,
                    amount: amountInKobo,
                    metadata: {
                        booking_id: appointment.id,
                        tenant_id: data.tenantId,
                        service_id: data.serviceId
                    },
                    callback_url: data.callbackUrl || `http://localhost:3000/booking/verify` // Fallback
                });

                if (response.status && response.data) {
                    // Update appointment with reference
                    await supabase.from('appointments').update({
                        payment_reference: response.data.reference
                    }).eq('id', appointment.id);

                    return {
                        success: true,
                        bookingId: appointment.id,
                        status: 'payment_pending',
                        paymentUrl: response.data.authorization_url,
                        reference: response.data.reference,
                        message: 'Redirecting to payment...'
                    };
                } else {
                    throw new Error(response.message || 'Payment initialization failed');
                }

            } catch (paymentError) {
                console.error('Payment Error:', paymentError);
                // Rollback? Or keep as pending?
                // Keeping as pending allows retry.
                return { success: false, error: 'Booking created but payment initialization failed. Please try again.' };
            }
        }

        // 7. Venue Payment Success
        return {
            success: true,
            bookingId: appointment.id,
            status: 'confirmed',
            message: 'Booking confirmed successfully!'
        };

    } catch (err: any) {
        console.error('[createBooking] System Error:', err);
        return { success: false, error: err.message || 'An unexpected system error occurred.' };
    }
}
