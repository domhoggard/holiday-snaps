import { storage } from './firebase.js';
import { ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";

const gallery = document.getElementById("gallery");
const filterBtn = document.getElementById("filter-btn");

filterBtn.addEventListener("click", () => {
  const startDate = new Date(document.getElementById("start-date").value);
  const endDate = new Date(document.getElementById("end-date").value);
  loadPublicPhotos(startDate, endDate);
});

async function loadPublicPhotos(start, end) {
  gallery.innerHTML = "Loading photos...";
  const rootRef = ref(storage);
  const userFolders = await listAll(rootRef);
  gallery.innerHTML = "";

  for (const userFolder of userFolders.prefixes) {
    const resorts = await listAll(userFolder);
    for (const resort of resorts.prefixes) {
      const dates = await listAll(resort);
      for (const dateFolder of dates.prefixes) {
        const dateStr = dateFolder.name;
        const date = new Date(dateStr);
        if (start && date < start) continue;
        if (end && date > end) continue;

        const privacies = await listAll(dateFolder);
        for (const privacyFolder of privacies.prefixes) {
          const privacy = privacyFolder.name;
          if (privacy !== "public" && privacy !== "friends") continue;

          const files = await listAll(privacyFolder);
          for (const file of files.items) {
            const url = await getDownloadURL(file);
            const photo = document.createElement("div");
            photo.classList.add("photo-card");

            const img = document.createElement("img");
            img.src = url;
            img.alt = file.name;
            img.classList.add("gallery-img");

            const badge = document.createElement("span");
            badge.className = `badge ${privacy}`;
            badge.textContent = privacy === "friends" ? "Friends Only" : "Public";

            photo.appendChild(img);
            photo.appendChild(badge);
            gallery.appendChild(photo);
          }
        }
      }
    }
  }

  if (gallery.innerHTML === "") {
    gallery.innerHTML = "<p>No photos found for that date range.</p>";
  }
}
