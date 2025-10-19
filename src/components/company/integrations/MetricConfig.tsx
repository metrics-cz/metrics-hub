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
    <div className="flex items-center justify-between p-4 border dark:border-gray-700 border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <span className="text-sm font-medium dark:text-gray-300 text-gray-700 capitalize">
          {name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm dark:text-gray-400 text-gray-600">Drop threshold:</span>
        <input
          type="number"
          min="1"
          max="100"
          value={dropThreshold}
          onChange={(e) => onThresholdChange(parseInt(e.target.value))}
          disabled={!enabled}
          className="w-16 px-2 py-1 text-sm border dark:border-gray-600 border-gray-300 rounded dark:bg-gray-700 dark:text-white bg-white text-gray-900 disabled:opacity-50"
        />
        <span className="text-sm dark:text-gray-400 text-gray-600">%</span>
      </div>
    </div>
  );
}
