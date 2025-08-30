import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAB2r7H-vfHspnraXwPnK5pricxKHQ4hIc",
  authDomain: "cashpoints-d0449.firebaseapp.com",
  projectId: "cashpoints-d0449",
  storageBucket: "cashpoints-d0449.firebasestorage.app",
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

// Initialize Analytics
export const analytics = getAnalytics(app);

// Admin credentials (for reference)
export const ADMIN_CREDENTIALS = {
  email: 'cashpoints@gmail.com',
  password: 'admin123'
};

// Export app instance
export default app;