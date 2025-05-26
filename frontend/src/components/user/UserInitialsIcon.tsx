'use client';


function getUserInitials(fullName?: string): string {
    if (!fullName) return '??';

    const nameParts = fullName.trim().split(/\s+/);

    if (nameParts.length >= 2) {
        return `${nameParts[0][0]} ${nameParts[1][0]}`.toUpperCase();
    }

    const firstWord = nameParts[0];
    return firstWord.substring(0, 2).toUpperCase();
}

type Props = {
    name?: string;
};

export default function UserInitialsIcon({ name }: Props) {
    const initials = getUserInitials(name);
    return (
        <div className="flex items-center justify-center w-8 h-8 text-sm font-semibold text-white bg-gray-400 rounded-full">
            {initials}
        </div>
    )
}