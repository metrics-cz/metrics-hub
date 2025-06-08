'use client';

import clsx from 'classnames';
import UserInitialsIcon from '@/components/user/UserInitialsIcon';

type Props = {
    src?: string | null;
    name?: string | null;
    size?: number;
    className?: string;
};

export default function Avatar({
    src,
    name,
    size = 32,
    className,
}: Props) {
    const dimension = `${size}px`;

    if (src) {
        return (
            <img
                src={src}
                alt={name ?? 'Avatar'}
                height={size}
                width={size}
                className={clsx(
                    'inline-block rounded-full object-cover select-none',
                    className
                )}
                style={{ height: dimension, width: dimension }}
            />
        );
    }

    /* fallback – initials */
    return (
        <UserInitialsIcon
            name={name ?? ''}
            
            className={className}
        />
    );
}
