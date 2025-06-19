import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import {
  onAuthStateChanged,
  deleteUser,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const profileInfo = document.getElementById("profile-info");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");

let currentUserId = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId = user.uid;
    const docSnap = await getDoc(doc(db, "users", currentUserId));
    if (docSnap.exists()) {
      const userData = docSnap.data();
      profileInfo.innerHTML = `
        <h3>Welcome, ${userData.name}</h3>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Date of Birth:</strong> ${userData.dob}</p>
        <p><a href="trips.html">View My Trips</a></p>
        <button onclick="deleteAccount()">Delete Account</button>
      `;
    } else {
      profileInfo.innerHTML = `<p>No profile data found.</p>`;
    }
  } else {
    window.location.href = "login.html";
  }
});

searchBtn.addEventListener("click", async () => {
  const term = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";

  if (!term) {
    return alert("Please enter a name or email to search.");
  }

  // Search for name OR email
  const q = query(collection(db, "users"));
  const querySnapshot = await getDocs(q);

  let resultsFound = 0;
  querySnapshot.forEach((docSnap) => {
    const user = docSnap.data();
    const uid = docSnap.id;

    if (
      uid !== currentUserId &&
      (user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term))
    ) {
      resultsFound++;
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${user.name}</strong> (${user.email})
        <button class="add-friend-btn" data-id="${uid}">Add Friend</button>
      `;
      searchResults.appendChild(li);
    }
  });

  if (resultsFound === 0) {
    searchResults.innerHTML = `<li>No matches found.</li>`;
  }
});

searchResults.addEventListener("click", async (e) => {
  if (e.target.classList.contains("add-friend-btn")) {
    const friendId = e.target.getAttribute("data-id");
    try {
      await updateDoc(doc(db, "users", currentUserId), {
        friends: arrayUnion(friendId)
      });
      alert("Friend added!");
    } catch (error) {
      console.error("Error adding friend:", error);
      alert("Failed to add friend.");
    }
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
  signOut(auth).then(() => {
    window.location.href = "index.html";
  }).catch(error => {
    console.error("Logout error:", error);
    alert("Logout failed.");
  });
};
