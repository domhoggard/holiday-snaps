import { auth, storage, db } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";
import { collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const photoInput = document.getElementById("photo");
  const resortInput = document.getElementById("resort");
  const dateInput = document.getElementById("date");
  const privacySelect = document.getElementById("privacy");
  const uploadButton = document.getElementById("upload-button");
  const gallery = document.getElementById("gallery");

  if (!photoInput || !uploadButton || !gallery) return;

  uploadButton.addEventListener("click", async () => {
    const file = photoInput.files[0];
    const resort = resortInput.value.trim();
    const date = dateInput.value;
    const privacy = privacySelect.value;

    if (!file || !resort || !date) {
      alert("Please fill in all fields before uploading.");
      return;
    }

    const filePath = `${resort}/${date}/${file.name}`;
    const fileRef = ref(storage, filePath);

    try {
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      await addDoc(collection(db, "photos"), {
        user: auth.currentUser.uid,
        resort,
        date,
        privacy,
        url: downloadURL,
        timestamp: new Date()
      });

      alert("Photo uploaded successfully!");
      loadPhotos(); // Refresh the gallery
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Error uploading photo.");
    }
  });

  async function loadPhotos() {
    gallery.innerHTML = "";

    const q = query(collection(db, "photos"), where("user", "==", auth.currentUser.uid));
    const snapshot = await getDocs(q);

    snapshot.forEach(doc => {
      const data = doc.data();
      const img = document.createElement("img");
      img.src = data.url;
      img.alt = `${data.resort} - ${data.date}`;
      img.classList.add("gallery-image");
      gallery.appendChild(img);
    });
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadPhotos();
    } else {
      window.location.href = "login.html";
    }
  });
});
