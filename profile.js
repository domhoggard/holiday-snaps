// profile.js – Profile page with edit for picture, about, status

import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";
import {
  onAuthStateChanged,
  deleteUser,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const profileInfo    = document.getElementById("profile-info");
const profilePicElem = document.getElementById("profile-pic");
const editPicBtn     = document.getElementById("edit-pic-btn");

let currentUser, currentUserId, userDocRef, storage;

onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "login.html";
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

  // Picture
  profilePicElem.src = data.profilePicture || "default-profile.png";

  // Format DOB to DD/MM/YYYY
  let dobFormatted = "—";
  if (data.dob) {
    const [yyyy, mm, dd] = data.dob.split("-");
    dobFormatted = `${dd}/${mm}/${yyyy}`;
  }

  // Render info fields with Edit buttons
  profileInfo.innerHTML = `
    <div class="field-group">
      <label>Date of Birth:</label>
      <span id="dob-text">${dobFormatted}</span>
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
      <button onclick="deleteAccount()">Delete Account</button>
    </div>
  `;
}

// Attach the three edit handlers after initial load
function attachEditHandlers() {
  document
    .getElementById("edit-pic-btn")
    .addEventListener("click", handlePicEdit);

  document
    .getElementById("edit-about-btn")
    .addEventListener("click", () => handleTextEdit(
      "about", "about-text", "textarea"
    ));

  document
    .getElementById("edit-status-btn")
    .addEventListener("click", () => handleTextEdit(
      "relationshipStatus", "status-text", "input"
    ));
}

// 1) Profile picture upload flow
function handlePicEdit() {
  // Replace edit button with file input
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    // upload to Storage under "profilePictures/{uid}"
    const picRef = storageRef(storage, `profilePictures/${currentUserId}/${file.name}`);
    await uploadBytes(picRef, file);
    const url = await getDownloadURL(picRef);
    // update Firestore
    await updateDoc(userDocRef, { profilePicture: url });
    profilePicElem.src = url;
    alert("Profile picture updated!");
    editPicBtn.style.display = ""; // show button back
  };
  editPicBtn.style.display = "none";
  editPicBtn.parentNode.appendChild(input);
}

// 3 & 4) Generic text-field editor for about/status
function handleTextEdit(fieldKey, textElemId, inputTag) {
  const container = document.getElementById(textElemId).parentNode;
  const oldText   = document.getElementById(textElemId).textContent;
  container.innerHTML = `
    <${inputTag} id="editor" ${
    inputTag==="textarea"?"rows=4 cols=30":'type="text"'
  }>${oldText==="—"?"":oldText}</${inputTag}>
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
    .addEventListener("click", () => {
      loadProfile().then(attachEditHandlers);
    });
}

// Delete & Logout unchanged
window.deleteAccount = async function () {
  if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
  try {
    await deleteDoc(userDocRef);
    await deleteUser(currentUser);
    alert("Your account has been deleted.");
    window.location.href = "index.html";
  } catch (err) {
    console.error(err);
    alert("Failed to delete account.");
  }
};

window.logOut = function () {
  signOut(auth)
    .then(() => window.location.href = "index.html")
    .catch(err => { console.error(err); alert("Logout failed."); });
};
