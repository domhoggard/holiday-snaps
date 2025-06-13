// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js"; // 👈 ADD THIS

const firebaseConfig = {
  apiKey: "AIzaSyDM3cs-CkpXNSXDiFYjuiNzdiGLMXZKZ5o",
  authDomain: "holidaysnaps-af8d3.firebaseapp.com",
  projectId: "holidaysnaps-af8d3",
  storageBucket: "gs://holidaysnaps-af8d3.firebasestorage.app", // ✅ Must end in .appspot.com
  messagingSenderId: "438127405798",
  appId: "1:438127405798:web:96fcaf79348e0a1e586927",
  measurementId: "G-BXC6W0GZ08"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // 👈 ADD THIS

// Export everything
export { app, auth, db, storage }; // 👈 EXPORT STORAGE

