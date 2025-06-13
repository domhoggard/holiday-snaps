import { getAuth, onAuthStateChanged, deleteUser, signOut } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import { app } from './firebase.js';

const auth = getAuth(app);
const db = getFirestore(app);

const nameField = document.getElementById('user-name');
const emailField = document.getElementById('user-email');
const dobField = document.getElementById('user-dob');

// Log out
window.logOut = async function () {
  await signOut(auth);
  window.location.href = 'index.html';
};

// Delete account
window.deleteAccount = async function () {
  const confirmDelete = confirm("Are you sure you want to permanently delete your account?");
  if (!confirmDelete) return;

  const user = auth.currentUser;
  if (user) {
    try {
      await deleteUser(user);
      alert("Account deleted.");
      window.location.href = "index.html";
    } catch (error) {
      alert("Error deleting account: " + error.message);
    }
  }
};

// Load profile data
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      nameField.innerHTML = data.name || "Unknown";
      emailField.innerHTML = user.email;
      dobField.innerHTML = data.dob || "Unknown";
    } else {
      nameField.innerHTML = "Unknown";
      emailField.innerHTML = user.email;
      dobField.innerHTML = "Unknown";
    }
  } else {
    window.location.href = "login.html";
  }
});
