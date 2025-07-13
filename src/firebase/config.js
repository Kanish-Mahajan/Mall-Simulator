import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Your Firebase configuration
// Replace these with your actual Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyArKgXgYiTPbVAtHVTAB9QvmF2q9FWkqkU",
    authDomain: "mall-simulator-1769b.firebaseapp.com",
    databaseURL: "https://mall-simulator-1769b-default-rtdb.firebaseio.com",
    projectId: "mall-simulator-1769b",
    storageBucket: "mall-simulator-1769b.firebasestorage.app",
    messagingSenderId: "371688857921",
    appId: "1:371688857921:web:123acfe3474386374381c0",
    measurementId: "G-W0068JRQMV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Connect to Firestore emulator in development (optional)
// Uncomment the line below if you want to use Firebase emulator
// if (process.env.NODE_ENV === 'development') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
// }

export default app; 