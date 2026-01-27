'use client';

import { useState, useEffect, useRef } from 'react';
import usePlacesAutocomplete, {
    getGeocode,
    getLatLng,
} from "use-places-autocomplete";
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (result: { lat: number; lng: number; address: string }) => void;
    className?: string;
}

export function AddressAutocomplete({
    value,
    onChange,
    onSelect,
    className
}: AddressAutocompleteProps) {
    const {
        ready,
        value: inputValue,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {},
        debounce: 300,
        defaultValue: value,
        initOnMount: true,
    });

    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync external value changes to internal state, but only if they differ significantly
    // to avoid fighting with user input
    useEffect(() => {
        if (value !== inputValue) {
            setValue(value, false);
        }
    }, [value, setValue, inputValue]); // Including inputValue might cause loops, strictly sync on value change from parent? 
    // Actually `usePlacesAutocomplete` is tricky with controlled inputs.
    // Better strategy: sync ONCE on mount or when parent totally changes context.
    // For now, let's just create a ref to track if we're focused.

    const handleSelect = async (address: string) => {
        setValue(address, false);
        clearSuggestions();
        setOpen(false);

        try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);

            // Notify parent
            onSelect({ lat, lng, address });
            // onChange(address); // Redundant, let parent handle update via onSelect
        } catch (error) {
            console.error("Error: ", error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        onChange(e.target.value);
        setOpen(true);
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Manually init if window.google is present (parent loaded it)
    useEffect(() => {
        // @ts-ignore
        if (window.google && window.google.maps && window.google.maps.places) {
            // usePlacesAutocomplete automatically detects google maps if it's there
        }
    }, []);

    return (
        <div className={cn("relative z-20", className)} ref={wrapperRef}>
            <div className="relative">
                <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    disabled={!ready}
                    placeholder="Search for an address..."
                    className="pr-10"
                />
                {/* Status indicator if needed */}
            </div>

            {open && status === "OK" && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-[300px] overflow-y-auto z-[9999] animate-in fade-in-0 zoom-in-95">
                    <ul className="py-1">
                        {data.map(({ place_id, description }) => (
                            <li
                                key={place_id}
                                className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex items-start gap-2"
                                onClick={() => handleSelect(description)}
                            >
                                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <span>{description}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
