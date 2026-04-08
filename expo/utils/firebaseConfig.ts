import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyB9e7kKg9bYT6d9Ye4KxUtkubFIVk-tSiU",
  authDomain: "one-pager-5ef8c.firebaseapp.com",
  projectId: "one-pager-5ef8c",
  storageBucket: "one-pager-5ef8c.firebasestorage.app",
  messagingSenderId: "820148998198",
  appId: "1:820148998198:web:f80bfd4a4004742e3dc897",
  measurementId: "G-PZ34CHCMWG"
};

const app = initializeApp(firebaseConfig);

function createFirestore(): Firestore {
  try {
    if (Platform.OS === 'web') {
      const fs = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
      console.log('Firestore initialized with persistent local cache (web)');
      return fs;
    } else {
      const fs = initializeFirestore(app, {
        localCache: persistentLocalCache({}),
      });
      console.log('Firestore initialized with persistent local cache (native)');
      return fs;
    }
  } catch (error: any) {
    console.warn('Firestore init with persistence failed, using default:', error?.message);
    return getFirestore(app);
  }
}

export const db: Firestore = createFirestore();

export const auth = getAuth(app);

console.log('Firebase initialized successfully');

export let firebaseAvailable = true;

export const setFirebaseAvailable = (available: boolean) => {
  firebaseAvailable = available;
};

export const testFirebaseConnection = async () => {
  try {
    console.log('Auth current user:', auth.currentUser?.uid || 'No user');
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
};

export default app;
