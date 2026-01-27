import { NextRequest, NextResponse } from 'next/server';
import { PaystackService } from '@/lib/payments/paystack';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { appointmentId, email, amount, callbackUrl } = body;

        if (!email || !amount) {
            return NextResponse.json({ error: 'Missing email or amount' }, { status: 400 });
        }

        // Generate a reference
        const reference = `binda_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Initialize with Paystack
        const result = await PaystackService.initializeTransaction({
            email,
            amount: amount * 100, // Convert to kobo if input is NGN
            reference,
            callback_url: callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/appointments/${appointmentId || ''}/confirmation`,
            metadata: {
                appointment_id: appointmentId,
                custom_fields: []
            }
        });

        if (!result.status) {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }

        // Ideally, we create a Payment record in DB here strictly pending
        if (appointmentId) {
            const supabase = await createClient();
            // Find tenant from appointment?
            // Fetch appointment first
            const { data: appt } = await supabase.from('appointments').select('tenant_id').eq('id', appointmentId).single();

            if (appt) {
                await supabase.from('payments').insert({
                    tenant_id: appt.tenant_id,
                    appointment_id: appointmentId,
                    provider: 'paystack',
                    amount: amount,
                    currency: 'NGN',
                    status: 'pending',
                    reference: reference, // Internal
                    paystack_reference: result.data.reference // Paystack's
                });
            }
        }

        return NextResponse.json(result.data);

    } catch (error) {
        console.error('Payment init error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
