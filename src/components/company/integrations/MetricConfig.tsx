'use client';

import React from 'react';

interface MetricConfigProps {
 name: string;
 enabled: boolean;
 dropThreshold: number;
 onEnabledChange: (enabled: boolean) => void;
 onThresholdChange: (threshold: number) => void;
}

/**
 * Reusable metric configuration component
 * Handles checkbox + threshold input for monitoring metrics
 */
export function MetricConfig({
 name,
 enabled,
 dropThreshold,
 onEnabledChange,
 onThresholdChange,
}: MetricConfigProps) {
 return (
  <div className="flex items-center justify-between p-4 border border-border-light rounded-lg">
   <div className="flex items-center gap-3">
    <input
     type="checkbox"
     checked={enabled}
     onChange={(e) => onEnabledChange(e.target.checked)}
     className="w-4 h-4 text-emerald-600 bg-input border-border-default rounded focus:ring-emerald-500 focus:ring-emerald-500 focus:ring-2 "
    />
    <span className="text-sm font-medium text-secondary capitalize">
     {name}
    </span>
   </div>
   <div className="flex items-center gap-2">
    <span className="text-sm text-secondary">Drop threshold:</span>
    <input
     type="number"
     min="1"
     max="100"
     value={dropThreshold}
     onChange={(e) => onThresholdChange(parseInt(e.target.value))}
     disabled={!enabled}
     className="w-16 px-2 py-1 text-sm border border-border-default rounded bg-card text-primary disabled:opacity-50"
    />
    <span className="text-sm text-secondary">%</span>
   </div>
  </div>
 );
}
