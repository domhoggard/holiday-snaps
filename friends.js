// friends.js – extracted friend functions

import { auth, db } from "./firebase.js";
import {
  doc, getDoc, getDocs,
  updateDoc, arrayUnion, arrayRemove,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const searchInput       = document.getElementById("searchInput");
const searchBtn         = document.getElementById("searchBtn");
const searchResults     = document.getElementById("searchResults");
const friendRequestsList = document.getElementById("friendRequests");
const friendList        = document.getElementById("friendList");
const requestBadge      = document.getElementById("requestBadge");

let currentUserId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "login.html";
  currentUserId = user.uid;

  // load incoming requests & current friends
  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.exists() ? snap.data() : {};
  loadFriendRequests(data.friendRequests || []);
  loadFriendList(data.friends || []);
});

window.logOut = () => {
  signOut(auth)
    .then(() => window.location.href = "index.html")
    .catch(err => { console.error(err); alert("Logout failed."); });
};

// SEARCH
searchBtn.addEventListener("click", async () => {
  const term = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";
  if (!term) return alert("Please enter a name or email to search.");

  // fetch all users
  const allUsers = await getDocs(collection(db, "users"));
  const meSnap   = await getDoc(doc(db, "users", currentUserId));
  const { friends = [], sentRequests = [] } = meSnap.data();

  allUsers.forEach(docSnap => {
    const user = docSnap.data(), uid = docSnap.id;
    if (uid === currentUserId) return;
    const match = user.name?.toLowerCase().includes(term)
               || user.email?.toLowerCase().includes(term);
    if (!match) return;

    const li  = document.createElement("li");
    li.textContent = `${user.name} (${user.email})`;
    const btn = document.createElement("button");

    if (friends.includes(uid)) {
      btn.textContent = "Friends ✓"; btn.disabled = true;
    } else if (sentRequests.includes(uid)) {
      btn.textContent = "Cancel Request";
      btn.onclick = () => cancelRequest(uid, li);
    } else {
      btn.textContent = "Send Friend Request";
      btn.onclick = () => sendFriendRequest(uid, user.name, li);
    }

    li.appendChild(btn);
    searchResults.appendChild(li);
  });
});

async function sendFriendRequest(uid, name, li) {
  await updateDoc(doc(db, "users", currentUserId), { sentRequests: arrayUnion(uid) });
  await updateDoc(doc(db, "users", uid),                 { friendRequests: arrayUnion(currentUserId) });
  alert(`Friend request sent to ${name}`);
  const btn = li.querySelector("button");
  btn.textContent = "Cancel Request";
  btn.onclick = () => cancelRequest(uid, li);
}

async function cancelRequest(uid, li) {
  await updateDoc(doc(db, "users", currentUserId), { sentRequests: arrayRemove(uid) });
  await updateDoc(doc(db, "users", uid),                 { friendRequests: arrayRemove(currentUserId) });
  alert("Friend request cancelled.");
  const btn = li.querySelector("button");
  btn.textContent = "Send Friend Request";
  btn.onclick = () => sendFriendRequest(uid, "", li);
}

// INCOMING REQUESTS
async function loadFriendRequests(incomingIds) {
  friendRequestsList.innerHTML = "";
  requestBadge.textContent = incomingIds.length ? `(${incomingIds.length})` : "";

  for (let uid of incomingIds) {
    const snap = await getDoc(doc(db, "users", uid));
    const user = snap.data();
    const li   = document.createElement("li");
    li.textContent = `${user.name} (${user.email})`;

    const approveBtn = document.createElement("button");
    approveBtn.textContent = "Approve";
    approveBtn.onclick = async () => {
      await updateDoc(doc(db, "users", currentUserId), {
        friendRequests: arrayRemove(uid),
        friends:         arrayUnion(uid)
      });
      await updateDoc(doc(db, "users", uid), {
        sentRequests: arrayRemove(currentUserId),
        friends:       arrayUnion(currentUserId)
      });
      alert(`You are now friends with ${user.name}`);
      li.remove();
      loadFriendList(); // refresh list
    };

    const declineBtn = document.createElement("button");
    declineBtn.textContent = "Decline";
    declineBtn.onclick = async () => {
      await updateDoc(doc(db, "users", currentUserId), { friendRequests: arrayRemove(uid) });
      await updateDoc(doc(db, "users", uid),                 { sentRequests: arrayRemove(currentUserId) });
      alert("Friend request declined.");
      li.remove();
    };

    li.append(approveBtn, declineBtn);
    friendRequestsList.appendChild(li);
  }
}

// FRIENDS LIST
async function loadFriendList() {
  friendList.innerHTML = "";
  const meSnap      = await getDoc(doc(db, "users", currentUserId));
  const friendIds   = meSnap.data().friends || [];

  for (let uid of friendIds) {
    const snap = await getDoc(doc(db, "users", uid));
    const f    = snap.data();
    const li   = document.createElement("li");
    li.textContent = `${f.name} (${f.email})`;
    friendList.appendChild(li);
  }
}
