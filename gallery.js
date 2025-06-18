import { storage } from './firebase.js';
import { ref, listAll, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';

const gallery = document.getElementById('photo-gallery');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const filterBtn = document.getElementById('filterBtn');

filterBtn.addEventListener('click', () => {
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  if (!startDate || !endDate) {
    alert("Please select both start and end dates.");
    return;
  }
  loadPhotos(startDate, endDate);
});

async function loadPhotos(start, end) {
  gallery.innerHTML = "";
  const result = await listAll(ref(storage));
  for (const userFolder of result.prefixes) {
    const resortList = await listAll(userFolder);
    for (const resortFolder of resortList.prefixes) {
      const dateList = await listAll(resortFolder);
      for (const dateFolder of dateList.prefixes) {
        const date = dateFolder.name;
        if (date >= start && date <= end) {
          const privacyList = await listAll(dateFolder);
          for (const privacyFolder of privacyList.prefixes) {
            const privacy = privacyFolder.name;
            if (privacy === "public" || privacy === "friends") {
              const images = await listAll(privacyFolder);
              for (const item of images.items) {
                const url = await getDownloadURL(item);
                const card = document.createElement("div");
                card.className = "photo-card";
                const img = document.createElement("img");
                img.src = url;
                img.alt = "Photo";
                img.className = "gallery-img";
                img.addEventListener("click", () => showModal(url));
                const badge = document.createElement("span");
                badge.className = "privacy-badge " + privacy;
                badge.textContent = privacy.charAt(0).toUpperCase() + privacy.slice(1);
                card.appendChild(img);
                card.appendChild(badge);
                gallery.appendChild(card);
              }
            }
          }
        }
      }
    }
  }
}

function showModal(url) {
  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modal-img");
  modal.style.display = "block";
  modalImg.src = url;

  document.getElementById("modal-close").onclick = function () {
    document.getElementById("modal").style.display = "none";
 };
}
