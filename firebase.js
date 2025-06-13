// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import {
  getAuth,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  listAll
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";

// ✅ Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDM3cs-CkpXNSXDiFYjuiNzdiGLMXZKZ5o",
  authDomain: "holidaysnaps-af8d3.firebaseapp.com",
  projectId: "holidaysnaps-af8d3",
  storageBucket: "gs://holidaysnaps-af8d3.firebasestorage.app", // ✅ Must end in .appspot.com,
  messagingSenderId: "438127405798",
  appId: "1:438127405798:web:96fcaf79348e0a1e586927",
  measurementId: "G-BXC6W0GZ08"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ✅ Export everything you need
export {
  app,
  auth,
  db,
  storage,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  ref,
  uploadBytes,
  getDownloadURL,
  listAll
};

  


