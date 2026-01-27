'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Upload, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface PhotoUploadProps {
    photos: string[];
    onChange: (photos: string[]) => void;
    maxPhotos?: number;
    bucketName?: string;
}

export default function PhotoUpload({
    photos = [],
    onChange,
    maxPhotos = 5,
    bucketName = 'tenant-assets'
}: PhotoUploadProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        // Validate
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error('Image must be less than 5MB');
            return;
        }

        if (photos.length >= maxPhotos) {
            toast.error(`You can only upload up to ${maxPhotos} photos`);
            return;
        }

        try {
            setUploading(true);

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `location-photos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            const newPhotos = [...photos, publicUrl];
            onChange(newPhotos);
            toast.success('Photo uploaded successfully');

        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Failed to upload photo');
        } finally {
            setUploading(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = (indexToRemove: number) => {
        const newPhotos = photos.filter((_, index) => index !== indexToRemove);
        onChange(newPhotos);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {photos.map((url, index) => (
                    <div key={url} className="relative aspect-square group rounded-lg overflow-hidden border bg-gray-50">
                        <Image
                            src={url}
                            alt={`Location photo ${index + 1}`}
                            fill
                            className="object-cover"
                        />
                        <button
                            onClick={() => handleRemove(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            type="button"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}

                {photos.length < maxPhotos && (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
                    >
                        {uploading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        ) : (
                            <>
                                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                                <span className="text-xs text-gray-500 font-medium">Upload Photo</span>
                            </>
                        )}
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
                disabled={uploading}
            />
            <p className="text-xs text-gray-500">
                {photos.length} / {maxPhotos} photos uploaded. JPEG, PNG up to 5MB.
            </p>
        </div>
    );
}
