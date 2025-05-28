// src/components/AuthProvider.tsx
'use client';
import { onAuthStateChanged, getAuth, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, createContext, useContext } from 'react';
import { auth } from '@/lib/firebase/firebaseClient';

const AuthContext = createContext<{ user: User | null }>({ user: null });

export function useAuth() {
    return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (!firebaseUser) {
                // 🔁 No user = redirect to login
                router.replace('/auth');
            } else {
                setUser(firebaseUser);
            }
        });

        return () => unsubscribe();
    }, [router]);

    return (
        <AuthContext.Provider value={{ user }}>
            {children}
        </AuthContext.Provider>
    );
}
