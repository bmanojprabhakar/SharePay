import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCoC_qvcZaG0J2-MbP88Xioh4Wg-r_5OK8",
  authDomain: "stage-sharepay.firebaseapp.com",
  projectId: "stage-sharepay",
  storageBucket: "stage-sharepay.firebasestorage.app",
  messagingSenderId: "866903847352",
  appId: "1:866903847352:web:cdecf36fad549a3ed5df4d",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
let auth;
try {
  auth = initializeAuth(app);
} catch (error) {
  // If auth is already initialized, just get it
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };