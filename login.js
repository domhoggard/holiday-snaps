// login.js

import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const form = document.getElementById("login-form");
const resetLink = document.getElementById("reset-password");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "profile.html";
  } catch (error) {
    alert("Login failed: " + error.message);
  }
});

resetLink.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  if (!email) {
    return alert("Please enter your email address above first.");
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert(
      "Password reset email sent! Check your inbox (and spam folder) for instructions."
    );
  } catch (error) {
    console.error("Password reset error:", error);
    alert("Could not send reset email: " + error.message);
  }
});
