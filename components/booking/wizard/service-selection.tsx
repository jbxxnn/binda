'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Service {
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
}

interface Props {
    selectedId: string | null;
    onSelect: (service: Service) => void;
}

export default function ServiceSelection({ selectedId, onSelect }: Props) {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/services')
            .then(res => res.json())
            .then(data => {
                setServices(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="text-center p-8">Loading services...</div>;

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search services..."
                    className="pl-10 h-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredServices.map(service => (
                    <div
                        key={service.id}
                        onClick={() => onSelect(service)}
                        className={`
                            group flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all hover:border-primary hover:bg-slate-50
                            ${selectedId === service.id ? 'border-primary bg-slate-50 ring-1 ring-primary' : ''}
                        `}
                    >
                        <div>
                            <h3 className="font-medium">{service.name}</h3>
                            <p className="text-sm text-gray-500">
                                {service.duration_minutes} mins • ₦{service.price.toLocaleString()}
                            </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors" />
                    </div>
                ))}

                {filteredServices.length === 0 && (
                    <div className="col-span-2 text-center p-8 text-gray-500 border border-dashed rounded-lg">
                        No services found
                    </div>
                )}
            </div>
        </div>
    );
}
