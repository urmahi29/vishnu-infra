import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBz_Lu4p_fi0w8GUhqHO12KGo_D3hGZI8o',
  authDomain: 'vishnu-infra.firebaseapp.com',
  projectId: 'vishnu-infra',
  storageBucket: 'vishnu-infra.firebasestorage.app',
  messagingSenderId: '538956666720',
  appId: '1:538956666720:web:940699ed5a5b5acb0b7005',
  measurementId: 'G-ZNZ3QMJMV8',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Google Sign-In
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    // Get Firebase ID token for backend verification
    const idToken = await user.getIdToken();
    return {
      idToken,
      user: {
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      },
    };
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

// Sign out from Firebase
export const firebaseSignOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Firebase sign-out error:', error);
  }
};

export { auth, googleProvider };
export default app;
