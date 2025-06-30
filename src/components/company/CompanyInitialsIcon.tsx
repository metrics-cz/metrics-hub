'use client';

import { useMemo } from 'react';
import clsx from 'classnames';

interface CompanyInitialsIconProps {
    name?: string | null;
    className?: string;
    size?: number;
}

// Pastel color palette with good contrast and aesthetic appeal
const PASTEL_COLORS = [
    'hsl(350, 40%, 80%)', // Soft pink
    'hsl(200, 45%, 75%)', // Light blue
    'hsl(150, 35%, 78%)', // Mint green
    'hsl(270, 40%, 82%)', // Lavender
    'hsl(25, 50%, 80%)',  // Peach
    'hsl(60, 45%, 85%)',  // Light yellow
    'hsl(300, 35%, 80%)', // Light purple
    'hsl(180, 40%, 78%)', // Light cyan
    'hsl(15, 45%, 82%)',  // Light coral
    'hsl(120, 30%, 80%)', // Light green
    'hsl(240, 40%, 80%)', // Light periwinkle
    'hsl(30, 50%, 85%)',  // Light orange
    'hsl(190, 35%, 78%)', // Light teal
    'hsl(340, 35%, 82%)', // Light rose
    'hsl(210, 40%, 78%)', // Light sky blue
];

/**
 * Creates a deterministic hash from a string
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Calculates relative luminance of an HSL color
 * Based on WCAG guidelines
 */
function getHSLLuminance(hslString: string): number {
    // Parse HSL string like "hsl(350, 40%, 80%)"
    const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return 0.5; // fallback
    
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    
    // Convert HSL to RGB first
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    if (h < 1/6) { r = c; g = x; b = 0; }
    else if (h < 2/6) { r = x; g = c; b = 0; }
    else if (h < 3/6) { r = 0; g = c; b = x; }
    else if (h < 4/6) { r = 0; g = x; b = c; }
    else if (h < 5/6) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    r = (r + m);
    g = (g + m);
    b = (b + m);
    
    // Calculate relative luminance
    const linearR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const linearG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const linearB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
}

/**
 * Renders a circular fallback avatar with the company's initials.
 * Uses random pastel colors with automatic contrast detection.
 */
export default function CompanyInitialsIcon({
    name,
    className,
    size = 32,
}: CompanyInitialsIconProps) {
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

    // ── generate color and contrast ───────────────────────────────────────
    const { backgroundColor, textColor } = useMemo(() => {
        if (!name) {
            // Fallback for empty names - subtle background, no content
            return {
                backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle white overlay
                textColor: 'transparent'
            };
        }

        // Get consistent color based on name
        const hash = hashString(name);
        const colorIndex = hash % PASTEL_COLORS.length;
        const bgColor = PASTEL_COLORS[colorIndex];
        
        // Determine text color based on background luminance
        const luminance = getHSLLuminance(bgColor);
        const textColor = luminance > 0.5 ? '#1f2937' : '#ffffff'; // gray-800 or white
        
        return {
            backgroundColor: bgColor,
            textColor: textColor
        };
    }, [name]);

    return (
        <div
            className={clsx(
                'inline-grid place-items-center rounded-full flex-shrink-0 aspect-square',
                'select-none font-medium uppercase',
                className
            )}
            style={{
                backgroundColor,
                color: textColor,
                width: `${size}px`,
                height: `${size}px`,
                fontSize: `${size * 0.4}px` // Font size scales with avatar size
            }}
        >
            {initials}
            <span className="sr-only">{name ?? 'Company avatar'}</span>
        </div>
    );
}