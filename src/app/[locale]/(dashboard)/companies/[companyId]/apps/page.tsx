'use client';
import * as React from 'react';
import AppSection from '@/components/apps/AppSection';
import { Plus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
export default function Page() {
    const router = useRouter();
    const path = usePathname();
    return (
        <div>
            <div className='flex justify-between mb-2 p-8'>
                <h1 className='text-3xl font-semibold mb-4'>Aplikace</h1>
                <button className="col-span-2 bg-primary text-white rounded-md p-2 disabled:opacity-50 inline-flex items-center gap-2"
                    onClick={() => router.push(`${path}/addApp`)}>
                    <Plus />Přidat aplikace</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[4fr_4fr] gap-8">
                <AppSection />
                {/* 
                TODO:
                Implement .map => <AppSection id=?/> for apps from ?DB? 
                */}
            </div>
        </div>);
}