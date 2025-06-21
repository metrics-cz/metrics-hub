'use client';

import { useMemo } from 'react';
import clsx from 'classnames';

interface UserInitialsIconProps {
    name?: string | null;
    className?: string;
}

/**
 * Renders a circular fallback avatar with the user's initials.
 * If no name is provided it shows a generic icon instead.
 */
export default function UserInitialsIcon({
    name,
    className,
}: UserInitialsIconProps) {
    // ── derive initials ────────────────────────────────────────────────
    const initials = useMemo(() => {
        if (!name) return '';
        // Split on whitespace, filter empty parts, take first char of first 2 parts
        return name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('');
    }, [name]);

    return (
        <div
            className={clsx(
                'inline-grid place-items-center rounded-full bg-gray-500/20 text-gray-800',
                'select-none font-medium uppercase',
                /* default size → w-8 h-8; you can override via `className` */
                'w-8 h-8',
                className
            )}
        >
            {initials || (
                <span aria-hidden="true">👤</span>
            )}
            <span className="sr-only">{name ?? 'User avatar'}</span>
        </div>
    );
}
