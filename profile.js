// profile.js – Profile page with full edit functionality

import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import {
  getStorage,
  ref      as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";
import {
  onAuthStateChanged,
  deleteUser,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const profileInfo    = document.getElementById("profile-info");
const editPicBtn     = document.getElementById("edit-pic-btn");
let profilePicElem, currentUser, currentUserId, userDocRef, storage;

// Keep track of the original picture URL during edits
let previousPicURL = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser    = user;
  currentUserId  = user.uid;
  userDocRef     = doc(db, "users", currentUserId);
  storage        = getStorage();

  await loadProfile();
  attachEditHandlers();
});

async function loadProfile() {
  const snap = await getDoc(userDocRef);
  if (!snap.exists()) {
    profileInfo.innerHTML = `<p>No profile data found.</p>`;
    return;
  }
  const data = snap.data();

  // Render the profile-card HTML
  profileInfo.innerHTML = `
    <div class="field-group">
      <img
        id="profile-pic"
        src="${data.profilePicture || "assets/images/default-profile.png"}"
        alt="Profile Picture"
        class="profile-picture"
      />
      <button id="edit-pic-btn" class="small-btn">Edit Picture</button>
    </div>

    <div class="field-group">
      <label>Date of Birth:</label>
      <span id="dob-text">${formatDob(data.dob)}</span>
    </div>

    <div class="field-group">
      <label>About Me:</label>
      <p id="about-text">${data.about || "—"}</p>
      <button id="edit-about-btn" class="small-btn">Edit</button>
    </div>

    <div class="field-group">
      <label>Relationship Status:</label>
      <span id="status-text">${data.relationshipStatus || "—"}</span>
      <button id="edit-status-btn" class="small-btn">Edit</button>
    </div>

    <div class="actions">
      <button id="delete-account-btn">Delete Account</button>
    </div>
  `;

  // Update reference to the newly rendered <img>
  profilePicElem = document.getElementById("profile-pic");
}

function formatDob(dob) {
  if (!dob) return "—";
  const [yyyy, mm, dd] = dob.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

function attachEditHandlers() {
  // Picture
  document
    .getElementById("edit-pic-btn")
    .addEventListener("click", handlePicEdit);

  // About Me
  document
    .getElementById("edit-about-btn")
    .addEventListener("click", () =>
      handleTextEdit("about", "about-text", "textarea")
    );

  // Relationship Status
  document
    .getElementById("edit-status-btn")
    .addEventListener("click", () =>
      handleTextEdit("relationshipStatus", "status-text", "input")
    );

  // Delete Account
  document
    .getElementById("delete-account-btn")
    .addEventListener("click", deleteAccount);
}

// --- Profile Picture Edit with Save/Cancel ---
function handlePicEdit() {
  const container = editPicBtn.parentNode;
  previousPicURL = profilePicElem.src;

  container.innerHTML = `
    <img
      id="profile-pic"
      src="${previousPicURL}"
      alt="Profile Picture"
      class="profile-picture"
    />
    <input type="file" id="pic-input" accept="image/*"/>
    <button id="save-pic-btn" class="small-btn">Save</button>
    <button id="cancel-pic-btn" class="small-btn">Cancel</button>
  `;

  profilePicElem = document.getElementById("profile-pic");

  container.querySelector("#save-pic-btn")
    .addEventListener("click", async () => {
      const fileInput = container.querySelector("#pic-input");
      const file = fileInput.files[0];
      if (!file) {
        alert("Please choose an image first.");
        return;
      }
      // Upload to Storage
      const picRef = storageRef(
        storage,
        `profilePictures/${currentUserId}/${file.name}`
      );
      await uploadBytes(picRef, file);
      const url = await getDownloadURL(picRef);

      // Update Firestore
      await updateDoc(userDocRef, { profilePicture: url });

      // Reload profile UI
      await loadProfile();
      attachEditHandlers();
      alert("Profile picture updated!");
    });

  container.querySelector("#cancel-pic-btn")
    .addEventListener("click", () => {
      // Restore original UI without saving
      restorePicUI(container);
    });
}

function restorePicUI(container) {
  container.innerHTML = `
    <img
      id="profile-pic"
      src="${previousPicURL}"
      alt="Profile Picture"
      class="profile-picture"
    />
    <button id="edit-pic-btn" class="small-btn">Edit Picture</button>
  `;
  profilePicElem = document.getElementById("profile-pic");
  // Re-attach handler
  document
    .getElementById("edit-pic-btn")
    .addEventListener("click", handlePicEdit);
}

// --- Generic About/Status Editor ---
function handleTextEdit(fieldKey, textElemId, inputTag) {
  const container = document.getElementById(textElemId).parentNode;
  const oldText = document.getElementById(textElemId).textContent;
  container.innerHTML = `
    <${inputTag}
      id="editor"
      ${inputTag === "textarea" ? "rows=4 cols=30" : 'type="text"'}
    >${oldText === "—" ? "" : oldText}</${inputTag}>
    <button id="save-btn" class="small-btn">Save</button>
    <button id="cancel-btn" class="small-btn">Cancel</button>
  `;

  container.querySelector("#save-btn")
    .addEventListener("click", async () => {
      const newVal = container.querySelector("#editor").value.trim();
      await updateDoc(userDocRef, { [fieldKey]: newVal });
      await loadProfile();
      attachEditHandlers();
    });

  container.querySelector("#cancel-btn")
    .addEventListener("click", async () => {
      await loadProfile();
      attachEditHandlers();
    });
}

// --- Delete Account & Logout ---
async function deleteAccount() {
  if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) {
    return;
  }
  try {
    await deleteDoc(userDocRef);
    await deleteUser(currentUser);
    alert("Your account has been deleted.");
    window.location.href = "index.html";
  } catch (err) {
    console.error("Deletion failed:", err);
    alert("Failed to delete account.");
  }
}

window.logOut = function () {
  signOut(auth)
    .then(() => window.location.href = "index.html")
    .catch(err => {
      console.error("Logout failed:", err);
      alert("Logout failed.");
    });
};

