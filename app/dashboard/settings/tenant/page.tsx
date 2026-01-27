'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';


import PhotoUpload from '@/components/ui/photo-upload';

export default function TenantSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        timezone: 'UTC',
        currency: 'NGN',
        location_photos: [] as string[],
    });

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
            // We need a PATCH endpoint, but for now let's assume one exists or we create it
            // Since we only have GET/POST in api/tenants/route.ts, we need to add PATCH there or use Supabase directly if user is admin
            // But RLS prevents direct update of 'tenants' via 'users' role usually, unless policy allows owner.
            // Let's check RLS: "Only service role can insert/update tenants" -> WAIT.
            // RLS Policy says: "Service role can manage tenants". Users can only SELECT.
            // So we MUST use an API route to update settings.

            const response = await fetch('/api/tenants', {
                method: 'PATCH', // We need to implement this!
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

    return (
        <div className="max-w-2xl mx-auto">
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
                                    disabled // Changing slug is complex, disable for now
                                    className="bg-gray-100"
                                />
                                <p className="text-xs text-gray-500 mt-1">Cannot be changed.</p>
                            </div>

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
