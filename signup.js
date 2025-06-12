// signup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

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

document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const dob = document.getElementById("dob").value;
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    await setDoc(doc(db, "users", uid), {
      name,
      dob,
      email
    });

    alert("Account created successfully!");
    window.location.href = "profile.html";
  } catch (error) {
    alert("Error: " + error.message);
  }
});
