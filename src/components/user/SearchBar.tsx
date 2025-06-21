'use client';

import { Search } from 'lucide-react';

type SearchBarProps = {
    /** Current query value (controlled input). */
    searchTerm: string;
    /** Setter that updates the query in the parent. */
    onSearch: (value: string) => void;
};

/**
 * Simple search bar with a magnifying-glass button.
 * The button is purely cosmetic for now (no `onSubmit`);
 * you can wire it up later if needed.
 */
export default function SearchBar({ searchTerm, onSearch }: SearchBarProps) {
    return (
        <div className="flex w-full items-center rounded border border-gray-400 p-1 focus-within:border-blue-500">
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search…"
                className="flex-grow border-none bg-transparent px-2 py-1 outline-none"
            />
            <button
                type="button"
                className="flex-shrink-0 rounded border border-blue-600 bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                aria-label="Search"
            >
                <Search size={16} />
            </button>
        </div>
    );
}