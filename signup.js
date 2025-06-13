import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const dob = document.getElementById('dob').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await setDoc(doc(db, "users", user.uid), {
      name,
      dob,
      email
    });
    alert("Sign up successful!");
    window.location.href = "profile.html";
  } catch (error) {
    alert("Error: " + error.message);
  }
});