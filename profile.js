import { auth, db } from "./firebase.js";
import {
  doc, getDoc, deleteDoc, updateDoc, arrayUnion, getDocs, collection, query, where
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import {
  onAuthStateChanged, deleteUser, signOut
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const profileInfo = document.getElementById("profile-info");
const searchInput = document.getElementById("user-search");
const resultsList = document.getElementById("search-results");

let currentUserId = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId = user.uid;
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
        <h4>Search for Friends</h4>
        <input type="text" id="user-search" placeholder="Enter name or email" />
        <ul id="search-results"></ul>
      `;
      document.getElementById("user-search").addEventListener("input", searchUsers);
    }
  } else {
    window.location.href = "login.html";
  }
});

async function searchUsers(event) {
  const term = event.target.value.trim().toLowerCase();
  resultsList.innerHTML = "";

  if (term.length < 3) return;

  const usersRef = collection(db, "users");
  const snapshot = await getDocs(usersRef);

  snapshot.forEach(docSnap => {
    const user = docSnap.data();
    const uid = docSnap.id;

    if (
      uid !== currentUserId &&
      (user.name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term))
    ) {
      const li = document.createElement("li");
      li.innerHTML = `${user.name} (${user.email}) 
        <button data-id="${uid}">Add Friend</button>`;
      li.querySelector("button").addEventListener("click", () => addFriend(uid));
      resultsList.appendChild(li);
    }
  });
}

async function addFriend(friendId) {
  if (!confirm("Send friend request?")) return;
  try {
    const userRef = doc(db, "users", currentUserId);
    await updateDoc(userRef, {
      friends: arrayUnion(friendId)
    });
    alert("Friend added!");
  } catch (err) {
    console.error("Error adding friend:", err);
    alert("Failed to add friend.");
  }
}

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
