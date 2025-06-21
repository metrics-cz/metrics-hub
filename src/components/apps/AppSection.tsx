'use client';
import { Cog } from "lucide-react";

export default function AppSection() {

    return (
        <div className='bg-white rounded-md w-9/10 flex gap-8 p-3 shadow-lg'>
            <Cog className="w-12 h-12" />
            <div>
                <h2 className="text-xl">Nazev aplikace</h2>
                <p>Krakty popis aplikace</p>
            </div>

        </div>
    )
} 