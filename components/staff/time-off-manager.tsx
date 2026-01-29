'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { format } from 'date-fns';

interface TimeOffBlock {
    id: string;
    start_time: string;
    end_time: string;
    reason: string | null;
}

export default function TimeOffManager({ staffId }: { staffId: string }) {
    const [blocks, setBlocks] = useState<TimeOffBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    // Form state
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadBlocks();
    }, [staffId]);

    const loadBlocks = async () => {
        try {
            const res = await fetch(`/api/staff/${staffId}/time-off?from=${new Date().toISOString()}`);
            if (res.ok) {
                const data = await res.json();
                setBlocks(data);
            }
        } catch (error) {
            console.error('Failed to load time off:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch(`/api/staff/${staffId}/time-off`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_time: new Date(start).toISOString(),
                    end_time: new Date(end).toISOString(),
                    reason
                })
            });

            if (res.ok) {
                setOpen(false);
                setStart('');
                setEnd('');
                setReason('');
                loadBlocks();
            }
        } catch (error) {
            console.error('Failed to add block:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this time off block?')) return;

        try {
            const res = await fetch(`/api/staff/${staffId}/time-off?timeOffId=${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setBlocks(blocks.filter(b => b.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete block:', error);
        }
    };

    return (
        <Card className="mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Time Off & Holidays</CardTitle>
                    <CardDescription>Block specific dates or times when this staff member is unavailable.</CardDescription>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Block
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Time Off</DialogTitle>
                            <DialogDescription>
                                Set a period where this staff member will not be bookable.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Start Date & Time</Label>
                                <Input
                                    type="datetime-local"
                                    required
                                    value={start}
                                    onChange={e => setStart(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date & Time</Label>
                                <Input
                                    type="datetime-local"
                                    required
                                    value={end}
                                    onChange={e => setEnd(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Reason (Optional)</Label>
                                <Input
                                    placeholder="e.g. Holiday, Sick Leave"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save Block
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                ) : blocks.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center border rounded-md bg-gray-50">
                        No upcoming time off blocks.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {blocks.map(block => (
                            <div key={block.id} className="flex items-center justify-between p-3 border rounded-md bg-white">
                                <div className="space-y-1">
                                    <div className="font-medium text-sm">
                                        {format(new Date(block.start_time), 'PP p')} - {format(new Date(block.end_time), 'PP p')}
                                    </div>
                                    {block.reason && (
                                        <div className="text-xs text-gray-500">{block.reason}</div>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDelete(block.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
