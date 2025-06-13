import { auth, db } from './firebase.js';
import { onAuthStateChanged, deleteUser, signOut } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const userInfo = document.getElementById("user-info");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      userInfo.innerHTML = `<p>Name: ${data.name}</p><p>Email: ${data.email}</p><p>DOB: ${data.dob}</p>`;
    }
  } else {
    window.location.href = "login.html";
  }
});

document.getElementById("delete-account").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (user && confirm("Are you sure you want to delete your account?")) {
    await deleteUser(user);
    alert("Account deleted");
    window.location.href = "index.html";
  }
});

document.getElementById("logout").addEventListener("click", () => {
  signOut(auth);
});