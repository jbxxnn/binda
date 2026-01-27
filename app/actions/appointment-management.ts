'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'pending_payment';

export async function updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus,
    notes?: string
) {
    const supabase = await createClient();

    // Validate user is authorized (staff/admin check implied by RLS or explicit check)
    // For now relying on RLS policies for 'update' on appointments

    const updateData: any = { status };
    if (notes) {
        // If we want to append notes, we'd need to fetch first. 
        // For simplicity, we might just update a "cancellation_reason" or append to notes if the column exists.
        // The DB schema has 'notes'. keeping it simple.
        updateData.notes = notes;
    }

    const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);

    if (error) {
        console.error('Error updating appointment:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/appointments');
    return { success: true };
}
