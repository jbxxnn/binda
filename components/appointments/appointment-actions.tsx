'use client';

import { useState } from 'react';
import { updateAppointmentStatus } from '@/app/actions/appointment-management';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Loader2, Check, X, UserX } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    id: string;
    currentStatus: string;
}

export default function AppointmentActions({ id, currentStatus }: Props) {
    const [loading, setLoading] = useState(false);
    // const { toast } = useToast(); -> Removed

    const handleStatusUpdate = async (status: 'confirmed' | 'cancelled' | 'completed' | 'no_show') => {
        setLoading(true);
        try {
            const result = await updateAppointmentStatus(id, status);
            if (!result.success) throw new Error(result.error);

            toast.success(`Appointment marked as ${status}.`);
        } catch (error: any) {
            toast.error(error.message || "Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(id)}>
                    Copy ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {currentStatus !== 'completed' && currentStatus !== 'cancelled' && (
                    <DropdownMenuItem onClick={() => handleStatusUpdate('completed')}>
                        <Check className="mr-2 h-4 w-4" /> Mark Completed
                    </DropdownMenuItem>
                )}

                {currentStatus !== 'cancelled' && (
                    <DropdownMenuItem onClick={() => handleStatusUpdate('cancelled')} className="text-red-600">
                        <X className="mr-2 h-4 w-4" /> Cancel Booking
                    </DropdownMenuItem>
                )}

                {currentStatus !== 'cancelled' && currentStatus !== 'completed' && (
                    <DropdownMenuItem onClick={() => handleStatusUpdate('no_show')}>
                        <UserX className="mr-2 h-4 w-4" /> Mark No-Show
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
