
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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
export const auth = getAuth(app);
export const db = getFirestore(app);
