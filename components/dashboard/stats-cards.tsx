import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, DollarSign, Activity } from 'lucide-react';

interface StatsProps {
    totalAppointments: number;
    completedAppointments: number;
    activeStaff: number;
    revenue: number; // In main currency unit
}

export default function StatsCards({ totalAppointments, completedAppointments, activeStaff, revenue }: StatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className='shadow-none' style={{ borderRadius: '1rem' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted p-2 px-4" style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                    <CardTitle className="text-sm font-medium">Appointments Todays</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className='min-h-[120px] flex flex-col justify-center gap-4'>
                    <div className="text-4xl font-mono font-bold">{totalAppointments}</div>
                    <p className="text-xs text-muted-foreground">For today</p>
                </CardContent>
            </Card>

            <Card className='shadow-none' style={{ borderRadius: '1rem' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted p-2 px-4" style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className='min-h-[120px] flex flex-col justify-center gap-4'>
                    <div className="text-4xl font-mono font-bold">{completedAppointments}</div>
                    <p className="text-xs text-muted-foreground">Finished today</p>
                </CardContent>
            </Card>

            <Card className='shadow-none' style={{ borderRadius: '1rem' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted p-2 px-4" style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                    <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className='min-h-[120px] flex flex-col justify-center gap-4'>
                    <div className="text-4xl font-mono font-bold">{activeStaff}</div>
                    <p className="text-xs text-muted-foreground">Working now</p>
                </CardContent>
            </Card>

            <Card className='shadow-none' style={{ borderRadius: '1rem' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted p-2 px-4" style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                    <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    <p className="h-4 w-4 text-muted-foreground">₦</p>
                </CardHeader>
                <CardContent className='min-h-[120px] flex flex-col justify-center gap-4'>
                    <div className="text-4xl font-mono font-bold">₦{revenue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Estimated today</p>
                </CardContent>
            </Card>
        </div>
    );
}
