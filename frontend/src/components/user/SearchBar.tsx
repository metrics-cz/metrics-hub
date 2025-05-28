import { User } from '@/lib/validation/firebaseSchemas';
import { Search } from 'lucide-react';

type Props = { users: User[] };
/* { users }: Props */
export default function SearchBar(){
    return (
        <div className="flex w-full items-center border border-gray-400 rounded p-1 focus-within:border-blue-500">
            <input
                type="text"
                placeholder="Search…"
                className="flex-grow px-2 py-1 bg-transparent border-none outline-none"
            />
            <button className="flex-shrink-0 px-3 py-1 border border-blue-600 bg-blue-600 text-white hover:bg-blue-700">
                <Search size={16} />
            </button>
        </div>
    );
}
