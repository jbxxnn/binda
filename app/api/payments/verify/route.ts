import { NextRequest, NextResponse } from 'next/server';
import { PaystackService } from '@/lib/payments/paystack';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { reference } = body;

        if (!reference) {
            return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
        }

        // Verify with Paystack
        const result = await PaystackService.verifyTransaction(reference);

        if (!result.status) {
            return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
        }

        const data = result.data;

        // Update DB if successful
        if (data.status === 'success') {
            const supabase = await createClient();

            // Update Payment Record
            const { data: payment } = await supabase
                .from('payments')
                .update({ status: 'success', metadata: data })
                .or(`reference.eq.${reference},paystack_reference.eq.${reference}`)
                .select()
                .single();

            // Update Appointment if linked
            if (payment && payment.appointment_id) {
                await supabase
                    .from('appointments')
                    .update({
                        deposit_paid: true,
                        // status: 'confirmed' // Maybe?
                    })
                    .eq('id', payment.appointment_id);
            }
        }

        return NextResponse.json({
            status: data.status,
            reference: data.reference,
            amount: data.amount
        });

    } catch (error) {
        console.error('Payment verify error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
