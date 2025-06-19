import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where
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

let currentUser = null;
let currentUserData = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");
  currentUser = user;

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    currentUserData = userSnap.data();
    profileInfo.innerHTML = `
      <h3>Welcome, ${currentUserData.name}</h3>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Date of Birth:</strong> ${currentUserData.dob}</p>
      <p><a href="trips.html">View My Trips</a></p>
      <button onclick="deleteAccount()">Delete Account</button>
    `;
  } else {
    profileInfo.innerHTML = `<p>No profile data found.</p>`;
  }
});

window.deleteAccount = async function () {
  if (!currentUser) return;
  if (confirm("Are you sure you want to delete your account? This cannot be undone.")) {
    try {
      await deleteDoc(doc(db, "users", currentUser.uid));
      await deleteUser(currentUser);
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

// 🔍 Friend Search
searchBtn.addEventListener("click", async () => {
  const keyword = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";

  if (!keyword || !currentUser || !currentUserData) return;

  const usersSnapshot = await getDocs(collection(db, "users"));
  usersSnapshot.forEach((docSnap) => {
    const user = docSnap.data();
    const uid = docSnap.id;

    // Skip current user and existing friends
    if (
      uid === currentUser.uid ||
      (currentUserData.friends && currentUserData.friends.includes(uid))
    ) return;

    const nameMatch = user.name.toLowerCase().includes(keyword);
    const emailMatch = user.email.toLowerCase().includes(keyword);
    if (nameMatch || emailMatch) {
      const li = document.createElement("li");
      li.textContent = `${user.name} (${user.email}) `;

      const btn = document.createElement("button");
      btn.textContent = "Add Friend";
      btn.onclick = () => addFriend(uid, user.name);

      li.appendChild(btn);
      searchResults.appendChild(li);
    }
  });
});

async function addFriend(friendUid, friendName) {
  if (!currentUser || !currentUserData) return;

  try {
    const newFriends = [...(currentUserData.friends || []), friendUid];
    await updateDoc(doc(db, "users", currentUser.uid), {
      friends: newFriends
    });

    alert(`${friendName} has been added as a friend.`);
    searchResults.innerHTML = "";
    searchInput.value = "";
  } catch (err) {
    console.error("Error adding friend:", err);
    alert("Failed to add friend.");
  }
}

