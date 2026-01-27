'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';

interface LocationPickerProps {
    value: { lat: number; lng: number } | null;
    onChange: (value: { lat: number; lng: number }) => void;
    onLocationSelect?: (address: string) => void;
    className?: string;
}

const mapContainerStyle = {
    width: '100%',
    height: '300px'
};

const defaultCenter = {
    lat: 6.5244,
    lng: 3.3792
};

const options = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
};

export default function LocationPicker({ value, onChange, onLocationSelect, className }: LocationPickerProps) {
    const mapRef = useRef<google.maps.Map | null>(null);
    const [center, setCenter] = useState(defaultCenter);

    // Sync center with value if provided
    useEffect(() => {
        if (value) {
            setCenter(value);
        }
    }, [value]);

    // Internal check for google availability to prevent crash
    const [libLoaded, setLibLoaded] = useState(false);
    useEffect(() => {
        // @ts-ignore
        if (typeof window !== 'undefined' && window.google) {
            setLibLoaded(true);
        } else {
            // Poll for it if needed, or rely on parent re-render?
            // Since parent uses useJsApiLoader, we should be good, but
            // let's be safe.
            const interval = setInterval(() => {
                // @ts-ignore
                if (typeof window !== 'undefined' && window.google) {
                    setLibLoaded(true);
                    clearInterval(interval);
                }
            }, 100);
            return () => clearInterval(interval);
        }
    }, []);

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const onMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            onChange({ lat, lng });

            // Reverse Geocode
            if (onLocationSelect) {
                try {
                    const geocoder = new google.maps.Geocoder();
                    const response = await geocoder.geocode({ location: { lat, lng } });
                    if (response.results[0]) {
                        onLocationSelect(response.results[0].formatted_address);
                    }
                } catch (error) {
                    console.error("Geocoding failed", error);
                }
            }
        }
    }, [onChange, onLocationSelect]);

    const onMarkerDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            onChange({ lat, lng });

            // Reverse Geocode
            if (onLocationSelect) {
                try {
                    const geocoder = new google.maps.Geocoder();
                    const response = await geocoder.geocode({ location: { lat, lng } });
                    if (response.results[0]) {
                        onLocationSelect(response.results[0].formatted_address);
                    }
                } catch (error) {
                    console.error("Geocoding failed", error);
                }
            }
        }
    }, [onChange, onLocationSelect]);

    if (!libLoaded) {
        return <div className={`w-full h-[300px] bg-slate-100 rounded-md flex items-center justify-center ${className}`}>Initializing Map...</div>;
    }


    return (
        <div className={`w-full h-[300px] rounded-md overflow-hidden border border-input ${className}`}>
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={13}
                center={center}
                options={options}
                onClick={onMapClick}
                onLoad={onMapLoad}
            >
                {value && (
                    <MarkerF
                        position={value}
                        draggable={true}
                        onDragEnd={onMarkerDragEnd}
                    />
                )}
            </GoogleMap>
        </div>
    );
}
