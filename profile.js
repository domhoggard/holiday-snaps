// profile.js – Profile page logic (friends functionality moved to friends.*)

import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import {
  onAuthStateChanged,
  deleteUser,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const profileInfo = document.getElementById("profile-info");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      const userData = docSnap.data();
      profileInfo.innerHTML = `
        <h3>Welcome, ${userData.name}</h3>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Date of Birth:</strong> ${userData.dob}</p>
        <p><a href="trips.html">View My Trips</a></p>
        <button onclick="deleteAccount()">Delete Account</button>
        <hr />
      `;
    } else {
      profileInfo.innerHTML = `<p>No profile data found.</p>`;
    }
  } catch (err) {
    console.error("❌ Failed to load profile:", err);
    profileInfo.innerHTML = `<p>Error loading profile. See console.</p>`;
  }
});

window.deleteAccount = async function () {
  const user = auth.currentUser;
  if (!user) return;

  if (confirm("Are you sure you want to delete your account? This cannot be undone.")) {
    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
      alert("Your account has been deleted.");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Account deletion failed:", error);
      alert("Failed to delete account.");
    }
  }
};

window.logOut = function () {
  signOut(auth)
    .then(() => {
      window.location.href = "index.html";
    })
    .catch(error => {
      console.error("Logout error:", error);
      alert("Logout failed.");
    });
};
