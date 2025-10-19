'use client';

import React from 'react';

interface NotificationInputProps {
  type: 'email' | 'slack' | 'discord' | 'whatsapp';
  enabled: boolean;
  value: string;
  onEnabledChange: (enabled: boolean) => void;
  onValueChange: (value: string) => void;
}

const NOTIFICATION_CONFIG = {
  email: {
    label: 'Email',
    inputType: 'email',
    placeholder: 'Enter email address',
  },
  slack: {
    label: 'Slack',
    inputType: 'url',
    placeholder: 'Enter Slack webhook URL',
  },
  discord: {
    label: 'Discord',
    inputType: 'url',
    placeholder: 'Enter Discord webhook URL',
  },
  whatsapp: {
    label: 'WhatsApp',
    inputType: 'url',
    placeholder: 'Enter WhatsApp webhook URL',
  },
} as const;

/**
 * Reusable notification input component
 * Handles checkbox + conditional input pattern for different notification types
 */
export function NotificationInput({
  type,
  enabled,
  value,
  onEnabledChange,
  onValueChange,
}: NotificationInputProps) {
  const config = NOTIFICATION_CONFIG[type];

  return (
    <div className="p-4 border dark:border-gray-700 border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <span className="text-sm font-medium dark:text-gray-300 text-gray-700">
            {config.label}
          </span>
        </div>
      </div>
      {enabled && (
        <input
          type={config.inputType}
          placeholder={config.placeholder}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border dark:border-gray-600 border-gray-300 rounded dark:bg-gray-700 dark:text-white bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      )}
    </div>
  );
}
