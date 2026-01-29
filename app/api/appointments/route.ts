import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasConflict } from '@/lib/booking/conflicts';
import { generateSlots } from '@/lib/booking/slot-generator'; // Re-use logic if needed, or rely on conflict check
import { DateTime } from 'luxon';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const {
            serviceId,
            staffId,
            startTime,
            customerId,
            customerName,
            customerPhone,
            customerEmail
        } = body;

        // 1. Basic Validation
        if (!serviceId || !staffId || !startTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Tenant Context
        // Get tenant from service to ensure security
        const { data: service } = await supabase
            .from('services')
            .select('*')
            .eq('id', serviceId)
            .single();

        if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        const tenantId = service.tenant_id;

        // 3. Customer Management
        // If ID provided, use it. If not, create new customer.
        let finalCustomerId = customerId;

        if (!finalCustomerId) {
            if (!customerName || !customerPhone) {
                return NextResponse.json({ error: 'Customer details required' }, { status: 400 });
            }

            // Check if customer exists by phone (per tenant)
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('phone', customerPhone)
                .single();

            if (existingCustomer) {
                finalCustomerId = existingCustomer.id;
            } else {
                // Create new
                const { data: newCustomer, error: createError } = await supabase
                    .from('customers')
                    .insert({
                        tenant_id: tenantId,
                        name: customerName,
                        phone: customerPhone,
                        email: customerEmail || null
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                finalCustomerId = newCustomer.id;
            }
        }

        // 4. Calculate End Time & Validate Availability
        // Note: We're trusting the client on start time, but we re-validate strict availability.
        const start = DateTime.fromISO(startTime);
        if (!start.isValid) return NextResponse.json({ error: 'Invalid time' }, { status: 400 });

        const minutes = service.duration_minutes + service.buffer_after_minutes; // Appointment blocks this duration? 
        // Actually the appointment record is strictly duration.
        // Buffers are for availability CALCULATION.
        // In DB, Appointment start->end is usually the service duration.

        const end = start.plus({ minutes: service.duration_minutes });

        // Availability Check (Double Check)
        // We check the "Buffer-Adjusted" range for conflicts.
        const checkStart = start.minus({ minutes: service.buffer_before_minutes });
        const checkEnd = end.plus({ minutes: service.buffer_after_minutes });

        const isConflict = await hasConflict(
            staffId,
            checkStart.toUTC().toISO()!,
            checkEnd.toUTC().toISO()!
        );

        if (isConflict) {
            return NextResponse.json({ error: 'Slot is no longer available' }, { status: 409 });
        }

        // 5. Create Appointment
        const { data: appointment, error: apptError } = await supabase
            .from('appointments')
            .insert({
                tenant_id: tenantId,
                staff_id: staffId,
                service_id: serviceId,
                customer_id: finalCustomerId,
                start_time: start.toUTC().toISO(),
                end_time: end.toUTC().toISO(),
                status: 'confirmed', // Or 'pending_payment' if we integrate that later
            })
            .select()
            .single();

        if (apptError) {
            console.error('Appointment creation error:', apptError);
            return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
        }

        // 6. Release any locks for this slot?
        // Optionally: If sessionId passed, release locks.
        // For now, simpler to let them expire or implementing unlock logic later.

        return NextResponse.json(appointment);

    } catch (error) {
        console.error('Error creating appointment:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
