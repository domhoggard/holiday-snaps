import { app, auth, db, storage } from "./firebase.js";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  listAll
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const photoForm = document.getElementById("photo-form");
const gallery = document.getElementById("photo-gallery");

onAuthStateChanged(auth, user => {
  if (!user) {
    alert("You must be logged in to use this page.");
    window.location.href = "login.html";
    return;
  }

  // Handle form submit
  photoForm.addEventListener("submit", async e => {
    e.preventDefault();

    const file = document.getElementById("photo").files[0];
    const resort = document.getElementById("resort").value.trim();
    const date = document.getElementById("date").value;
    const privacy = document.getElementById("privacy").value;

    if (!file || !resort || !date || !privacy) {
      alert("Please complete all fields.");
      return;
    }

    const path = `${user.uid}/${resort}/${date}/${file.name}`;
    const fileRef = storageRef(storage, path);

    try {
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      await addDoc(collection(db, "photos"), {
        userId: user.uid,
        url,
        resort,
        date,
        privacy,
        timestamp: Date.now()
      });

      alert("Photo uploaded!");
      photoForm.reset();
      loadPhotos(user.uid); // reload
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload photo.");
    }
  });

  // Load user's uploaded photos
  loadPhotos(user.uid);
});

async function loadPhotos(userId) {
  gallery.innerHTML = "";

  const q = query(
    collection(db, "photos"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    gallery.innerHTML = "<p>No photos uploaded yet.</p>";
    return;
  }

  snapshot.forEach(doc => {
    const { url, resort, date, privacy } = doc.data();

    const photoDiv = document.createElement("div");
    photoDiv.className = "photo";

    photoDiv.innerHTML = `
      <img src="${url}" alt="Holiday photo">
      <p><strong>Resort:</strong> ${resort}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Privacy:</strong> ${privacy}</p>
    `;

    gallery.appendChild(photoDiv);
  });
}

