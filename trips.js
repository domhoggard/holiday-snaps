import { auth, storage } from './firebase.js';
import { ref, uploadBytes, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const form = document.getElementById('upload-form');
const gallery = document.getElementById('photo-gallery');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = document.getElementById('photo').files[0];
  const resort = document.getElementById('resort').value;
  const date = document.getElementById('date').value;
  const privacy = document.getElementById('privacy').value;

  if (!file || !resort || !date || !privacy) {
    alert("Fill out all fields.");
    return;
  }

  const filePath = `photos/${resort}/${date}/${privacy}_${file.name}`;
  const photoRef = ref(storage, filePath);
  await uploadBytes(photoRef, file);
  alert("Uploaded!");
  loadPhotos();
});

async function loadPhotos() {
  gallery.innerHTML = "";
  const listRef = ref(storage, "photos");
  const res = await listAll(listRef);

  for (const folderRef of res.prefixes) {
    const dateFolders = await listAll(folderRef);
    for (const dateFolder of dateFolders.prefixes) {
      const files = await listAll(dateFolder);
      for (const itemRef of files.items) {
        const url = await getDownloadURL(itemRef);
        const img = document.createElement("img");
        img.src = url;
        img.alt = "Uploaded photo";
        gallery.appendChild(img);
      }
    }
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    loadPhotos();
  }
});