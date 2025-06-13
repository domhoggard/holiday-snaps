
import { auth, db } from './firebase.js';
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import { onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    document.getElementById("profile-info").innerHTML = `
      <p><strong>Name:</strong> ${docSnap.data().name}</p>
      <p><strong>DOB:</strong> ${docSnap.data().dob}</p>
      <p><strong>Email:</strong> ${docSnap.data().email}</p>
    `;
  }
});

document.getElementById("delete-account").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (confirm("Are you sure you want to delete your account?")) {
    await deleteDoc(doc(db, "users", user.uid));
    await deleteUser(user);
    alert("Account deleted");
    window.location.href = "index.html";
  }
});
