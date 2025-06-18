// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import {
  getStorage
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js"; // ✅ Added for db

const firebaseConfig = {
  apiKey: "AIzaSyDM3cs-CkpXNSXDiFYjuiNzdiGLMXZKZ5o",
  authDomain: "holidaysnaps-af8d3.firebaseapp.com",
  projectId: "holidaysnaps-af8d3",
  storageBucket: "holidaysnaps-af8d3.firebasestorage.app",
  messagingSenderId: "438127405798",
  appId: "1:438127405798:web:96fcaf79348e0a1e586927",
  measurementId: "G-BXC6W0GZ08"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app); // ✅ This line enables Firestore access

// ✅ Define logOut before exporting it
function logOut() {
  signOut(auth).then(() => {
    alert("Logged out.");
    window.location.href = "index.html";
  }).catch((error) => {
    console.error("Logout error:", error);
    alert("Logout failed.");
  });
}

// ✅ Export everything
export {
  app,
  auth,
  storage,
  db, // ✅ Added db export
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  deleteUser,
  logOut
};

