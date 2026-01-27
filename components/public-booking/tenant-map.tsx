'use client';

import { useJsApiLoader, GoogleMap, MarkerF } from '@react-google-maps/api';
import { useMemo } from 'react';

interface TenantMapProps {
    latitude: number;
    longitude: number;
}

const containerStyle = {
    width: '100%',
    height: '250px',
    borderRadius: '0.5rem'
};

const options = {
    disableDefaultUI: true,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
};

export default function TenantMap({ latitude, longitude }: TenantMapProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
    });

    const center = useMemo(() => ({
        lat: latitude,
        lng: longitude
    }), [latitude, longitude]);

    if (loadError) {
        return (
            <div className="w-full h-[250px] bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-sm p-4 text-center border border-red-100">
                Map Error: {loadError.message}
            </div>
        );
    }

    if (!isLoaded) {
        return <div className="w-full h-[250px] bg-slate-100 rounded-lg animate-pulse" />;
    }

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={15}
            options={options}
        >
            <MarkerF position={center} />
        </GoogleMap>
    );
}
