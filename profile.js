
import { auth, db } from "./firebase.js";
import {
  doc, getDoc, deleteDoc, getDocs,
  query, collection, updateDoc, arrayUnion,
  setDoc, onSnapshot, deleteField
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import {
  onAuthStateChanged, deleteUser, signOut
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const profileInfo = document.getElementById("profile-info");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");
const friendRequestsList = document.getElementById("friendRequests");
const notificationBadge = document.getElementById("notificationBadge");

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
        <hr />
        <h3>Search for Friends</h3>
        <input type="text" id="searchInput" placeholder="Enter name or email" />
        <ul id="searchResults"></ul>
        <hr />
        <h3>Friend Requests <span id="notificationBadge" style="color:red;"></span></h3>
        <ul id="friendRequests"></ul>
      `;

      watchFriendRequests();
    } else {
      profileInfo.innerHTML = "<p>No profile data found.</p>";
    }
  } else {
    window.location.href = "login.html";
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

// Friend search
searchBtn.addEventListener("click", async () => {
  const term = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";

  if (!term) return alert("Please enter a name or email to search.");

  const allUsers = await getDocs(query(collection(db, "users")));
  allUsers.forEach(async (docSnap) => {
    const user = docSnap.data();
    const uid = docSnap.id;

    if (uid !== currentUserId &&
        (user.name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term))) {
      const li = document.createElement("li");
      li.textContent = `${user.name} (${user.email})`;

      const btn = document.createElement("button");
      btn.textContent = "Send Friend Request";
      btn.onclick = async () => {
        await setDoc(doc(db, "users", uid, "friendRequests", currentUserId), {
          from: currentUserId,
          name: auth.currentUser.displayName || user.name || "Someone",
          status: "pending"
        });
        alert("Friend request sent.");
      };

      li.appendChild(btn);
      searchResults.appendChild(li);
    }
  });
});

// Watch friend requests
function watchFriendRequests() {
  const ref = collection(db, "users", currentUserId, "friendRequests");

  onSnapshot(ref, (snapshot) => {
    let pendingCount = 0;
    friendRequestsList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const request = docSnap.data();
      if (request.status === "pending") {
        pendingCount++;
        const li = document.createElement("li");
        li.textContent = `Friend request from ${request.name}`;

        const acceptBtn = document.createElement("button");
        acceptBtn.textContent = "Accept";
        acceptBtn.onclick = async () => {
          await updateDoc(doc(db, "users", currentUserId), {
            friends: arrayUnion(request.from)
          });
          await updateDoc(doc(db, "users", request.from), {
            friends: arrayUnion(currentUserId)
          });
          await setDoc(doc(db, "users", currentUserId, "friendRequests", request.from), {
            ...request,
            status: "accepted"
          });
        };

        const declineBtn = document.createElement("button");
        declineBtn.textContent = "Decline";
        declineBtn.onclick = async () => {
          await setDoc(doc(db, "users", currentUserId, "friendRequests", request.from), {
            ...request,
            status: "declined"
          });
        };

        li.appendChild(acceptBtn);
        li.appendChild(declineBtn);
        friendRequestsList.appendChild(li);
      }
    });

    notificationBadge.textContent = pendingCount > 0 ? `(${pendingCount})` : "";
  });
}
