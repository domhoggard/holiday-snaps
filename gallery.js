import { auth, storage, logOut } from './firebase.js';
import { ref, listAll, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

const title = document.getElementById("resort-title");
const gallery = document.getElementById("photo-gallery");

const params = new URLSearchParams(window.location.search);
const resort = params.get("resort");

onAuthStateChanged(auth, async user => {
  if (!user || !resort) return location.href = "trips.html";

  title.textContent = `Gallery - ${resort}`;
  const resortRef = ref(storage, `${user.uid}/${resort}`);
  const dates = await listAll(resortRef);

  for (const dateFolder of dates.prefixes) {
    const date = dateFolder.name;
    const heading = document.createElement("h3");
    heading.textContent = date;
    gallery.appendChild(heading);

    const privacies = await listAll(dateFolder);
    for (const privacyFolder of privacies.prefixes) {
      const pics = await listAll(privacyFolder);
      for (const item of pics.items) {
        const url = await getDownloadURL(item);
        const img = document.createElement("img");
        img.src = url;
        img.classList.add("gallery-img");
        gallery.appendChild(img);
      }
    }
  }
});
