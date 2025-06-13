import { auth, db, signOut } from './firebase.js';
import { onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const profileName = document.getElementById('profile-name');
const profileDob = document.getElementById('profile-dob');

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      profileName.innerHTML = data.name;
      profileDob.innerHTML = data.dob;
    }
  }
});

window.deleteAccount = async function () {
  try {
    await deleteUser(auth.currentUser);
    alert("Account deleted.");
    window.location.href = "index.html";
  } catch (error) {
    alert("Error deleting account: " + error.message);
  }
};

window.logOut = function () {
  signOut(auth).then(() => window.location.href = "index.html");
};