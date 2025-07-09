// login.js – handles sign-in on index.html/login form

import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

// If the user is already signed in, send them to their profile immediately
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "profile.html";
  }
});

const form = document.getElementById("login-form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email    = form.email.value.trim();
  const password = form.password.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will fire and redirect
  } catch (err) {
    console.error("Login failed:", err);
    alert("Login error: " + err.message);
  }
});

