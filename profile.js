// profile.js - Friend request system

import { auth, db } from "./firebase.js";
import {
doc,
getDoc,
deleteDoc,
getDocs,
updateDoc,
arrayUnion,
arrayRemove,
collection
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
const friendRequestsList = document.getElementById("friendRequests");
const friendList = document.getElementById("friendList");
const requestBadge = document.getElementById("requestBadge");

let currentUserId = null;

onAuthStateChanged(auth, async (user) => {
if (user) {
currentUserId = user.uid;
const docSnap = await getDoc(doc(db, "users", user.uid));
if (docSnap.exists()) {
const userData = docSnap.data();
profileInfo.innerHTML = <h3>Welcome, ${userData.name}</h3> <p><strong>Email:</strong> ${user.email}</p> <p><strong>Date of Birth:</strong> ${userData.dob}</p> <p><a href="trips.html">View My Trips</a></p> <button onclick="deleteAccount()">Delete Account</button> <hr /> ;
loadFriendRequests(userData.friendRequests || []);
loadFriendList(userData.friends || []);
} else {
profileInfo.innerHTML = <p>No profile data found.</p>;
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

searchBtn.addEventListener("click", async () => {
const term = searchInput.value.trim().toLowerCase();
searchResults.innerHTML = "";
if (!term) return alert("Please enter a name or email to search.");

const q = await getDocs(collection(db, "users"));
const currentUserSnap = await getDoc(doc(db, "users", currentUserId));
const { friends = [], sentRequests = [] } = currentUserSnap.data();

q.forEach((docSnap) => {
const user = docSnap.data();
const uid = docSnap.id;
if (
uid !== currentUserId &&
(user.name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term))
) {
const li = document.createElement("li");
li.textContent = ${user.name} (${user.email});

javascript
Copy
Edit
  const btn = document.createElement("button");

  if (friends.includes(uid)) {
    btn.textContent = "Friends ✓";
    btn.disabled = true;
  } else if (sentRequests.includes(uid)) {
    btn.textContent = "Cancel Request";
    btn.onclick = () => cancelRequest(uid, li);
  } else {
    btn.textContent = "Send Friend Request";
    btn.onclick = () => sendFriendRequest(uid, user.name, li);
  }

  li.appendChild(btn);
  searchResults.appendChild(li);
}
});
});

async function sendFriendRequest(uid, name, liElement) {
await updateDoc(doc(db, "users", currentUserId), {
sentRequests: arrayUnion(uid)
});
await updateDoc(doc(db, "users", uid), {
friendRequests: arrayUnion(currentUserId)
});
alert(Friend request sent to ${name});
liElement.querySelector("button").textContent = "Cancel Request";
liElement.querySelector("button").onclick = () => cancelRequest(uid, liElement);
}

async function cancelRequest(uid, liElement) {
await updateDoc(doc(db, "users", currentUserId), {
sentRequests: arrayRemove(uid)
});
await updateDoc(doc(db, "users", uid), {
friendRequests: arrayRemove(currentUserId)
});
alert("Friend request cancelled.");
liElement.querySelector("button").textContent = "Send Friend Request";
liElement.querySelector("button").onclick = () => sendFriendRequest(uid, "", liElement);
}

async function loadFriendRequests(incomingIds) {
friendRequestsList.innerHTML = "";
requestBadge.textContent = incomingIds.length > 0 ? (${incomingIds.length}) : "";

for (let uid of incomingIds) {
const snap = await getDoc(doc(db, "users", uid));
const user = snap.data();
const li = document.createElement("li");
li.textContent = ${user.name} (${user.email});

javascript
Copy
Edit
const approveBtn = document.createElement("button");
approveBtn.textContent = "Approve";
approveBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUserId), {
    friendRequests: arrayRemove(uid),
    friends: arrayUnion(uid)
  });
  await updateDoc(doc(db, "users", uid), {
    sentRequests: arrayRemove(currentUserId),
    friends: arrayUnion(currentUserId)
  });
  alert(`You are now friends with ${user.name}`);
  li.remove();
  loadFriendList(); // refresh list
};

const declineBtn = document.createElement("button");
declineBtn.textContent = "Decline";
declineBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUserId), {
    friendRequests: arrayRemove(uid)
  });
  await updateDoc(doc(db, "users", uid), {
    sentRequests: arrayRemove(currentUserId)
  });
  alert("Friend request declined.");
  li.remove();
};

li.appendChild(approveBtn);
li.appendChild(declineBtn);
friendRequestsList.appendChild(li);
}
}

async function loadFriendList() {
const snap = await getDoc(doc(db, "users", currentUserId));
const friendIds = snap.data().friends || [];

friendList.innerHTML = "";

for (let uid of friendIds) {
const friendSnap = await getDoc(doc(db, "users", uid));
const friend = friendSnap.data();
const li = document.createElement("li");
li.textContent = ${friend.name} (${friend.email});
friendList.appendChild(li);
}
}
