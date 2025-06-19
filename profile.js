import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  deleteDoc,
  getDocs,
  query,
  collection,
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
        <h3>Search for Friends</h3>
        <input type="text" id="searchInput" placeholder="Enter name or email" />
        <ul id="searchResults"></ul>
      `;
    } else {
      profileInfo.innerHTML = `<p>No profile data found.</p>`;
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

// Friend search logic
searchBtn.addEventListener("click", async () => {
  const term = searchInput.value.trim().toLowerCase();
  console.log("🔍 Searching for:", term);
  searchResults.innerHTML = "";

  if (!term) return alert("Please enter a name or email to search.");

  try {
    const q = query(collection(db, "users"));
    const querySnapshot = await getDocs(q);
    console.log("📄 Total user documents:", querySnapshot.size);

    let found = 0;

    querySnapshot.forEach((docSnap) => {
      const user = docSnap.data();
      const uid = docSnap.id;

      if (
        uid !== currentUserId &&
        (user.name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term))
      ) {
        found++;
        console.log("✅ Match found:", user.email);

        const li = document.createElement("li");
        li.textContent = `${user.name} (${user.email})`;

        const btn = document.createElement("button");
        btn.textContent = "Add Friend";
        btn.onclick = async () => {
          await updateDoc(doc(db, "users", currentUserId), {
            friends: arrayUnion(uid)
          });
          alert(`${user.name} added as a friend!`);
        };

        li.appendChild(btn);
        searchResults.appendChild(li);
      }
    });

    if (found === 0) {
      console.log("❌ No matches found.");
      searchResults.innerHTML = `<li>No matching users found.</li>`;
    }

  } catch (err) {
    console.error("Error during search:", err);
    alert("Search failed. See console for details.");
  }
});
