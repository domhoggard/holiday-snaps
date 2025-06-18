import { auth, storage } from "./firebase.js";
import { ref, uploadBytes, getDownloadURL, listAll } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("upload-form");
  const gallery = document.getElementById("gallery");

  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const file = document.getElementById("photo").files[0];
          const resort = document.getElementById("resort").value;
          const date = document.getElementById("date").value;
          const privacy = document.getElementById("privacy").value;

          if (file && resort && date && privacy) {
            const filePath = `${user.uid}/${resort}/${date}/${privacy}/${file.name}`;
            const fileRef = ref(storage, filePath);
            await uploadBytes(fileRef, file);
            alert("Photo uploaded!");
            loadPhotos(user.uid);
          } else {
            alert("Please fill out all fields and select a file.");
          }
        });
      }

      loadPhotos(user.uid);
    } else {
      window.location.href = "login.html";
    }
  });

  async function loadPhotos(uid) {
    if (!gallery) return;
    gallery.innerHTML = "";
    const userRef = ref(storage, `${uid}`);
    const res = await listAll(userRef);

    for (const resortFolder of res.prefixes) {
      const dates = await listAll(resortFolder);
      for (const dateFolder of dates.prefixes) {
        const privacies = await listAll(dateFolder);
        for (const privacyFolder of privacies.prefixes) {
          const photos = await listAll(privacyFolder);
          for (const item of photos.items) {
            const url = await getDownloadURL(item);
            const img = document.createElement("img");
            img.src = url;
            img.alt = "Holiday snap";
            img.classList.add("gallery-img");
            gallery.appendChild(img);
          }
        }
      }
    }
  }
});
