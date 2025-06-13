// profile.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged, deleteUser, signOut } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

// DOM elements
const nameField = document.getElementById('user-name');
const emailField = document.getElementById('user-email');
const dobField = document.getElementById('user-dob');

// Make logout work
window.logOut = async function () {
  await signOut(auth);
  window.location.href = 'index.html';
};

// Make delete account work
window.deleteAccount = async function () {
  const confirmDelete = confirm("Are you sure you want to delete your account?");
  if (!confirmDelete) return;

  const user = auth.currentUser;
  try {
    await deleteUser(user);
    alert("Account deleted.");
    window.location.href = "index.html";
  } catch (error) {
    alert("Error deleting account: " + error.message);
  }
};

// Fetch and display profile data
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      nameField.textContent = data.name || "Unknown";
      emailField.textContent = user.email;
      dobField.textContent = data.dob || "Unknown";
    } else {
      nameField.textContent = "Unknown";
      emailField.textContent = user.email;
      dobField.textContent = "Unknown";
    }
  } else {
    window.location.href = "login.html";
  }
});
