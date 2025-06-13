import { auth, db } from './firebase.js';
import { onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const profileDiv = document.getElementById("profile-info");
const deleteBtn = document.getElementById("delete-account");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      profileDiv.innerHTML = `
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Date of Birth:</strong> ${data.dob}</p>
        <p><strong>Email:</strong> ${data.email}</p>
      `;
    }
  } else {
    window.location.href = "login.html";
  }
});

deleteBtn.addEventListener("click", async () => {
  if (confirm("Are you sure you want to delete your account?")) {
    const user = auth.currentUser;
    if (user) {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
      alert("Account deleted.");
      window.location.href = "index.html";
    }
  }
});
