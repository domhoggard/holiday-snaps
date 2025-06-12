// profile.js
import { auth, db } from './firebase.js';
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

auth.onAuthStateChanged(async user => {
  if (user) {
    const uid = user.uid;
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      document.getElementById("profile-name").textContent = userData.name;
      document.getElementById("profile-dob").textContent = userData.dob;
      document.getElementById("profile-email").textContent = user.email;
    } else {
      console.error("No profile data found.");
    }
  } else {
    // Not signed in, redirect to login
    window.location.href = "login.html";
  }
});
