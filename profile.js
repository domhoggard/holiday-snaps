import { auth, db } from "./firebase.js";
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import { onAuthStateChanged, deleteUser, signOut } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      const userData = docSnap.data();
      document.getElementById("profile").innerHTML = `
        <h2>Welcome, ${userData.name}</h2>
        <p><strong>Email:</strong> ${userData.email}</p>
        <p><strong>Date of Birth:</strong> ${userData.dob}</p>
        <a href="trips.html">View My Trips</a><br/><br/>
        <button onclick="deleteAccount()">Delete Account</button>
      `;
    }
  } else {
    window.location.href = "login.html";
  }
});

window.deleteAccount = async function () {
  const user = auth.currentUser;
  if (confirm("Are you sure you want to delete your account? This cannot be undone.")) {
    await deleteDoc(doc(db, "users", user.uid));
    await deleteUser(user);
    alert("Account deleted.");
    window.location.href = "index.html";
  }
};

window.logOut = function () {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
};