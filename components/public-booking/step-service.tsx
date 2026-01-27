'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ChevronRight, Clock } from 'lucide-react';

interface Service {
    id: string;
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
}

interface Props {
    tenantId: string;
    currency: string;
    value?: string;
    onSelect: (service: Service) => void;
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StepService({ tenantId, currency, value, onSelect }: Props) {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) return;

        fetch(`/api/public/services?tenantId=${tenantId}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed');
                return res.json();
            })
            .then(data => {
                setServices(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [tenantId]);

    const handleValueChange = (serviceId: string) => {
        const service = services.find(s => s.id === serviceId);
        if (service) {
            onSelect(service);
        }
    };

    if (loading) {
        return (
            <div className="space-y-2">
                <div>
                    <h2 className="text-md font-regular text-slate-800">Select a Service</h2>
                </div>
                <div className="h-[90px] w-full bg-primary animate-pulse border border-primary rounded-md" style={{ height: '50px', borderRadius: '0.3rem' }} />
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div>
                <h2 className="text-md font-regular text-slate-800">Select a Service</h2>
                {/* <p className="text-sm text-slate-500">Choose the treatment you'd like to book</p> */}
            </div>

            <Select value={value} onValueChange={handleValueChange}>
                <SelectTrigger className="w-full h-[90px] rounded-md bg-primary border border-primary focus:border-primary active:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0" style={{ height: '50px', borderRadius: '0.3rem' }}>
                    <SelectValue placeholder="Select a service..." />
                </SelectTrigger>
                <SelectContent>
                    {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                            <div className="flex flex-col text-left">
                                <span className="font-medium">{service.name}</span>
                                <div className="flex items-center gap-2 text-xs">
                                    <span>{service.duration_minutes} mins</span>
                                    <span>•</span>
                                    <span>{currency} {service.price.toLocaleString()}</span>
                                </div>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {services.length === 0 && (
                <div className="text-sm text-red-500">
                    No services available for booking online.
                </div>
            )}
        </div>
    );
}
