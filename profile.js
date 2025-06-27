// profile.js – Profile page with placeholder + working Edit Picture

import { auth, db } from "./firebase.js";
import {
  doc, getDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import {
  getStorage, ref as storageRef,
  uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";
import {
  onAuthStateChanged,
  deleteUser, signOut
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const profileInfo = document.getElementById("profile-info");
let currentUser, userDocRef, storage, previousPicURL;

// 1) On load, redirect if not signed in, else render
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser  = user;
  userDocRef   = doc(db, "users", user.uid);
  storage      = getStorage();
  await renderProfile();
});

// 2) Build the markup for the profile card
async function renderProfile() {
  const snap = await getDoc(userDocRef);
  const data = snap.exists() ? snap.data() : {};

  // pick placeholder or stored pic
  const picURL = data.profilePicture || "default-profile.png";
  previousPicURL = picURL;

  // format DOB → DD/MM/YYYY
  let dobText = "—";
  if (data.dob) {
    const [yyyy, mm, dd] = data.dob.split("-");
    dobText = `${dd}/${mm}/${yyyy}`;
  }

  profileInfo.innerHTML = `
    <div class="field-group" id="pic-group">
      <img id="profile-pic" src="${picURL}" alt="Profile Picture" class="profile-picture"/>
      <button id="edit-pic-btn" class="small-btn">Edit Picture</button>
    </div>

    <div class="field-group">
      <label>Date of Birth:</label>
      <span>${dobText}</span>
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

  // wire up event handlers
  document.getElementById("edit-pic-btn").addEventListener("click", onEditPicture);
  document.getElementById("edit-about-btn").addEventListener("click", () =>
    handleTextEdit("about", "about-text", "textarea")
  );
  document.getElementById("edit-status-btn").addEventListener("click", () =>
    handleTextEdit("relationshipStatus", "status-text", "input")
  );
  document.getElementById("delete-account-btn").addEventListener("click", deleteAccount);
}

// 3) Picture edit flow: swap in file input + Save/Cancel
function onEditPicture() {
  const picGroup = document.getElementById("pic-group");
  picGroup.innerHTML = `
    <img id="profile-pic" src="${previousPicURL}" alt="Profile Picture" class="profile-picture"/>
    <input type="file" id="pic-input" accept="image/*" />
    <button id="save-pic-btn" class="small-btn">Save</button>
    <button id="cancel-pic-btn" class="small-btn">Cancel</button>
  `;
  document.getElementById("save-pic-btn").addEventListener("click", savePicture);
  document.getElementById("cancel-pic-btn").addEventListener("click", () => {
    // restore original UI
    renderProfile();
  });
}

async function savePicture() {
  const fileInput = document.getElementById("pic-input");
  const file = fileInput.files[0];
  if (!file) return alert("Please choose an image first.");

  // upload & get URL
  const ref = storageRef(storage, `profilePictures/${currentUser.uid}/${file.name}`);
  await uploadBytes(ref, file);
  const url = await getDownloadURL(ref);

  // update Firestore
  await updateDoc(userDocRef, { profilePicture: url });

  // re-render
  await renderProfile();
}

// 4) Generic text‐field editor (About + Status)
function handleTextEdit(fieldKey, textId, tag) {
  const container = document.getElementById(textId).parentNode;
  const oldValue = document.getElementById(textId).textContent;
  container.innerHTML = `
    <${tag} id="editor" ${tag==="textarea"?"rows=4 cols=30":'type="text"'}>${
    oldValue==="—"?"":oldValue
  }</${tag}>
    <button id="save-text-btn" class="small-btn">Save</button>
    <button id="cancel-text-btn" class="small-btn">Cancel</button>
  `;

  document.getElementById("save-text-btn").addEventListener("click", async () => {
    const newVal = document.getElementById("editor").value.trim();
    await updateDoc(userDocRef, { [fieldKey]: newVal });
    await renderProfile();
  });

  document.getElementById("cancel-text-btn").addEventListener("click", renderProfile);
}

// 5) Delete account & logout unchanged
async function deleteAccount() {
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
}

window.logOut = () => {
  signOut(auth)
    .then(() => window.location.href = "index.html")
    .catch(err => { console.error(err); alert("Logout failed."); });
};
