import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';


export const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const fnc = getFunctions(app, 'europe-west1');

/* --- Storage – LAZY; nejdřív null, doplní se až v browseru --------- */
let _storage: ReturnType<typeof getStorage> | null = null;
export const getClientStorage = () => {
    // 1) už existuje
    if (_storage) return _storage;

    // 2) build nebo SSR → zatím nemáme window
    if (typeof window === 'undefined') return null;

    // 3) první inicializace v prohlížeči
    _storage = getStorage(app);

    if (
        process.env.NEXT_PUBLIC_EMULATORS === 'true' &&
        // aby se nepřipojovalo opakovaně
        (_storage as any)._delegate?.host !== 'localhost'
    ) {
        connectStorageEmulator(_storage, 'localhost', 9199);
    }
    return _storage;
};

const useEmu = process.env.NEXT_PUBLIC_EMULATORS === 'true'
            && typeof window !== 'undefined'
            && location.hostname === 'localhost';

if (useEmu) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectDatabaseEmulator(rtdb, 'localhost', 9000);
    connectFunctionsEmulator(fnc, 'localhost', 5001);
}


