'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import PhotoUpload from '@/components/ui/photo-upload';
import { AddressAutocomplete } from '@/components/settings/address-autocomplete';
import { useJsApiLoader } from '@react-google-maps/api';

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('@/components/settings/location-picker'), {
    ssr: false,
    loading: () => <div className="w-full h-[300px] bg-slate-100 rounded-md flex items-center justify-center">Loading Map...</div>
});

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

export default function TenantSettingsPage() {
    const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: libraries
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        timezone: 'UTC',
        currency: 'NGN',
        about_us: '',
        address: '',
        latitude: null as number | null,
        longitude: null as number | null,
        location_photos: [] as string[],
    });

    useEffect(() => {
        // Debug logs for map loading
        console.log("Maps Loaded State:", isGoogleMapsLoaded);
        console.log("Map Error:", googleMapsError);
        // @ts-ignore
        console.log("Window Google Present:", typeof window !== 'undefined' && !!window.google);
    }, [isGoogleMapsLoaded, googleMapsError]);

    useEffect(() => {
        async function loadTenant() {
            try {
                setLoading(true);
                // GET from API which handles permission checks
                const response = await fetch('/api/tenants');
                if (!response.ok) throw new Error('Failed to load tenant');

                const tenant = await response.json();
                setFormData({
                    name: tenant.name,
                    slug: tenant.slug,
                    timezone: tenant.timezone,
                    currency: tenant.currency,
                    about_us: tenant.about_us || '',
                    address: tenant.address || '',
                    latitude: tenant.latitude || null,
                    longitude: tenant.longitude || null,
                    location_photos: tenant.location_photos || [],
                });
            } catch (error) {
                console.error(error);
                setMessage({ type: 'error', text: 'Failed to load business details' });
            } finally {
                setLoading(false);
            }
        }

        loadTenant();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const response = await fetch('/api/tenants', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update settings');
            }

            setMessage({ type: 'success', text: 'Settings updated successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'An error occurred' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8">Loading settings...</div>;
    }

    if (googleMapsError) {
        return <div className="p-8 text-red-500">Error loading Google Maps. Please check your network or API key.</div>;
    }

    if (!isGoogleMapsLoaded) {
        return <div className="p-8">Loading Maps API...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto pb-10">
            <Card>
                <CardHeader>
                    <CardTitle>Business Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name">Business Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="slug">Slug (URL)</Label>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    disabled
                                    className="bg-gray-100"
                                />
                                <p className="text-xs text-gray-500 mt-1">Cannot be changed.</p>
                            </div>

                            <div>
                                <Label htmlFor="about_us">About Us</Label>
                                <Textarea
                                    id="about_us"
                                    value={formData.about_us}
                                    onChange={(e) => setFormData({ ...formData, about_us: e.target.value })}
                                    rows={4}
                                    placeholder="Tell customers about your business..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="timezone">Timezone</Label>
                                    <select
                                        id="timezone"
                                        value={formData.timezone}
                                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="Africa/Lagos">Africa/Lagos</option>
                                        <option value="Africa/Accra">Africa/Accra</option>
                                        <option value="Africa/Nairobi">Africa/Nairobi</option>
                                        <option value="UTC">UTC</option>
                                    </select>
                                </div>

                                <div>
                                    <Label htmlFor="currency">Currency</Label>
                                    <select
                                        id="currency"
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="NGN">NGN - Nigerian Naira</option>
                                        <option value="GHS">GHS - Ghanaian Cedi</option>
                                        <option value="KES">KES - Kenyan Shilling</option>
                                        <option value="USD">USD - US Dollar</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <Label>Location</Label>

                            <div>
                                <Label htmlFor="address" className="text-xs text-muted-foreground">Address / Description</Label>
                                <AddressAutocomplete
                                    value={formData.address}
                                    onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
                                    onSelect={(result) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            address: result.address,
                                            latitude: result.lat,
                                            longitude: result.lng
                                        }));
                                    }}
                                />
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground mb-2 block">Pin on Map</Label>
                                <LocationPicker
                                    value={formData.latitude && formData.longitude ? { lat: formData.latitude, lng: formData.longitude } : null}
                                    onChange={(pos) => setFormData(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }))}
                                    onLocationSelect={(address) => setFormData(prev => ({ ...prev, address }))}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Click on the map to set your precise location. This will be used for directions.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <Label>Location Photos</Label>
                            <p className="text-sm text-gray-500 mb-2">
                                Upload up to 5 photos of your salon or business location. These will be displayed to customers.
                            </p>
                            <PhotoUpload
                                photos={formData.location_photos}
                                onChange={(photos) => setFormData({ ...formData, location_photos: photos })}
                                maxPhotos={5}
                            />
                        </div>

                        {message && (
                            <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {message.text}
                            </div>
                        )}

                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
