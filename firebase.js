import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDM3cs-CkpXNSXDiFYjuiNzdiGLMXZKZ5o",
  authDomain: "holidaysnaps-af8d3.firebaseapp.com",
  projectId: "holidaysnaps-af8d3",
  storageBucket: "holidaysnaps-af8d3.appspot.com",
  messagingSenderId: "438127405798",
  appId: "1:438127405798:web:96fcaf79348e0a1e586927",
  measurementId: "G-BXC6W0GZ08"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, signOut };