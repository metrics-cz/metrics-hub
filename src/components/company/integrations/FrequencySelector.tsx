'use client';

import React from 'react';

interface FrequencySelectorProps {
 selected: '4h' | '8h' | '12h' | '24h' | '48h';
 onChange: (frequency: '4h' | '8h' | '12h' | '24h' | '48h') => void;
 pricing: Record<string, number>;
}

/**
 * Frequency selector with pricing display
 * Shows execution frequency options with associated costs
 */
export function FrequencySelector({ selected, onChange, pricing }: FrequencySelectorProps) {
 return (
  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
   {Object.entries(pricing).map(([freq, price]) => (
    <label key={freq} className="relative">
     <input
      type="radio"
      value={freq}
      checked={selected === freq}
      onChange={(e) => onChange(e.target.value as any)}
      className="sr-only"
     />
     <div
      className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
       selected === freq
        ? 'border-primary-500 bg-primary-50'
        : 'border-border-default hover:border-primary-300'
      }`}
     >
      <div className="text-center">
       <div className="font-semibold text-sm text-primary">{freq}</div>
       <div className="text-xs text-secondary">${price}/mo</div>
      </div>
     </div>
    </label>
   ))}
  </div>
 );
}
