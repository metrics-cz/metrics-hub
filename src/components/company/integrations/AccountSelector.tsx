'use client';

import React from 'react';

interface AccountSelectorProps {
 accountType: 'mcc' | 'direct';
 mccEmail?: string;
 onChange: (type: 'mcc' | 'direct') => void;
}

/**
 * Account type selector for Google Ads integrations
 * Allows selection between MCC and direct account access
 */
export function AccountSelector({ accountType, mccEmail, onChange }: AccountSelectorProps) {
 return (
  <div className="space-y-2">
   <label className="flex items-center">
    <input
     type="radio"
     value="mcc"
     checked={accountType === 'mcc'}
     onChange={(e) => onChange('mcc')}
     className="mr-2"
    />
    <span className="text-sm text-secondary">
     MCC Account {mccEmail && `(${mccEmail})`}
    </span>
   </label>
   <label className="flex items-center">
    <input
     type="radio"
     value="direct"
     checked={accountType === 'direct'}
     onChange={(e) => onChange('direct')}
     className="mr-2"
    />
    <span className="text-sm text-secondary">Direct Account</span>
   </label>
  </div>
 );
}
