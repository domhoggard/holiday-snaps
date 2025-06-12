
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      document.getElementById("user-name").textContent = docSnap.data().name;
      document.getElementById("user-dob").textContent = docSnap.data().dob;
    }
  } else {
    window.location.href = "login.html";
  }
});

window.logOut = function () {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
}
