
import { auth, storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL, listAll } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";

document.getElementById("upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = document.getElementById("photo").files[0];
  const resort = document.getElementById("resort").value;
  const date = document.getElementById("date").value;
  const privacy = document.getElementById("privacy").value;

  const user = auth.currentUser;
  const filePath = \`\${user.uid}/\${resort}/\${date}/\${privacy}/\${file.name}\`;
  const fileRef = ref(storage, filePath);

  try {
    await uploadBytes(fileRef, file);
    alert("Photo uploaded successfully!");
    loadPhotos(); // refresh gallery
  } catch (error) {
    alert(error.message);
  }
});

async function loadPhotos() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";
  const user = auth.currentUser;
  const baseRef = ref(storage, user.uid);

  const list = await listAll(baseRef);
  for (const folder of list.prefixes) {
    const photos = await listAll(folder);
    for (const photoRef of photos.items) {
      const url = await getDownloadURL(photoRef);
      const img = document.createElement("img");
      img.src = url;
      img.className = "gallery-photo";
      gallery.appendChild(img);
    }
  }
}

window.onload = () => {
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = "login.html";
    } else {
      loadPhotos();
    }
  });
};
