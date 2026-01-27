
import Image from 'next/image';
import TenantImageSlider from './tenant-image-slider';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    currency: string;
    timezone: string;
    location_photos: string[];
}


export default function TenantContainer({ tenant }: { tenant: Tenant }) {
    return (
        <div>
            Tenant Container
            {tenant.name}
            {tenant.slug}
            {tenant.currency}
            {tenant.timezone}
            <TenantImageSlider images={tenant.location_photos} name={tenant.name} className="h-[500px]" />
        </div>
    );
}