const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Path to the Firebase service account key file
const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');

let firebaseAdmin = null;

const initializeFirebaseAdmin = () => {
  if (firebaseAdmin) return firebaseAdmin;

  // Check if service account file exists
  if (!fs.existsSync(serviceAccountPath)) {
    console.warn('⚠️  Firebase service account key not found at:', serviceAccountPath);
    console.warn('   Google Sign-In will not work until you place the JSON file there.');
    console.warn('   Download from: Firebase Console → Project Settings → Service accounts');
    return null;
  }

  try {
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseAdmin = admin;
    console.log('✅ Firebase Admin SDK initialized successfully');
    return firebaseAdmin;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    return null;
  }
};

// Verify a Firebase ID token
const verifyFirebaseToken = async (idToken) => {
  const fbAdmin = initializeFirebaseAdmin();
  if (!fbAdmin) {
    throw new Error('Firebase Admin SDK not initialized');
  }

  try {
    const decodedToken = await fbAdmin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Firebase token verification failed:', error.message);
    throw new Error('Invalid Firebase token');
  }
};

module.exports = { initializeFirebaseAdmin, verifyFirebaseToken };
