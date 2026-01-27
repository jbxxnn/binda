
import Image from 'next/image';
import TenantImageSlider from './tenant-image-slider';
import TenantMap from './tenant-map';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    currency: string;
    timezone: string;
    location_photos: string[];
    about_us?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
}


export default function TenantContainer({ tenant }: { tenant: Tenant }) {
    return (
        <div>
            <TenantImageSlider images={tenant.location_photos} name={tenant.name} className="h-[300px]" />
            <div className='px-4 mt-6 space-y-6'>
                <div>
                    <h2 className='text-2xl font-medium'>{tenant.name}</h2>
                    {tenant.address && (
                        <p className="text-slate-500 text-sm mt-1">{tenant.address}</p>
                    )}
                </div>

                {tenant.about_us && (
                    <div>
                        <h3 className="text-lg font-semibold mb-2">About Us</h3>
                        <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                            {tenant.about_us}
                        </p>
                    </div>
                )}

                {tenant.latitude && tenant.longitude && (
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Location</h3>
                        <div className="space-y-3">
                            <TenantMap latitude={tenant.latitude} longitude={tenant.longitude} />

                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-slate-900">Get Directions</span>
                                    <span className="text-xs text-slate-500">View on Google Maps</span>
                                </div>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${tenant.latitude},${tenant.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                                >
                                    Get Directions
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}