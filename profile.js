// profile.js

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from './firebase.js';

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Watch for login state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // Get the user's document from Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        // Fill in the profile HTML with user data
        document.getElementById("profile-name").textContent = data.name;
        document.getElementById("profile-dob").textContent = data.dob;
        document.getElementById("profile-email").textContent = user.email;
      } else {
        console.error("No user profile found in Firestore.");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  } else {
    // If not signed in, redirect to login page
    window.location.href = "login.html";
  }
});
