import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAB2r7H-vfHspnraXwPnK5pricxKHQ4hIc",
  authDomain: "cashpoints-d0449.firebaseapp.com",
  projectId: "cashpoints-d0449",
  storageBucket: "cashpoints-d0449.appspot.com", // ✅ fixed here
  messagingSenderId: "156712241026",
  appId: "1:156712241026:web:6fb02b7e78d02723bef19b",
  measurementId: "G-WXKRYEC93N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Analytics (only works in browser environment)
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

// Admin credentials (for reference, ⚠️ better to keep in .env file)
export const ADMIN_CREDENTIALS = {
  email: 'cashpoints@gmail.com',
  password: 'admin123'
};

// Export app instance
export default app;
