import { auth, storage, db } from './firebase.js';
import { ref, listAll, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

const gallery = document.getElementById('photo-gallery');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const filterBtn = document.getElementById('filterBtn');
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const modalClose = document.getElementById("modal-close");
const modalPrev = document.getElementById("modal-prev");
const modalNext = document.getElementById("modal-next");

let imageList = [];
let currentIndex = 0;
let currentUserId = null;

onAuthStateChanged(auth, (user) => {
  currentUserId = user?.uid || null;
});

filterBtn.addEventListener('click', async () => {
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  if (!startDate || !endDate) {
    alert("Please select both start and end dates.");
    return;
  }
  await loadPhotos(startDate, endDate);
});

async function loadPhotos(start, end) {
  gallery.innerHTML = "";
  imageList = [];

  const userDocs = await getDocs(collection(db, "users"));
  for (const userDoc of userDocs.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();
    const isFriend = userData.friends?.includes(currentUserId);
    const isOwner = uid === currentUserId;

    try {
      const resortList = await listAll(ref(storage, uid));
      for (const resortFolder of resortList.prefixes) {
        const dateList = await listAll(resortFolder);
        for (const dateFolder of dateList.prefixes) {
          const date = dateFolder.name;
          if (date >= start && date <= end) {
            const privacyList = await listAll(dateFolder);
            for (const privacyFolder of privacyList.prefixes) {
              const privacy = privacyFolder.name;

              const canView =
                privacy === "public" ||
                (privacy === "friends" && isFriend) ||
                (privacy === "private" && isOwner);

              if (canView) {
                const images = await listAll(privacyFolder);
                for (const item of images.items) {
                  const url = await getDownloadURL(item);
                  imageList.push({ url, privacy });

                  const card = document.createElement("div");
                  card.className = "photo-card";

                  const img = document.createElement("img");
                  img.src = url;
                  img.alt = "Photo";
                  img.className = "gallery-img";
                  const index = imageList.length - 1;
                  img.addEventListener("click", () => showModal(index));

                  const badge = document.createElement("span");
                  badge.className = "badge " + privacy;
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
    } catch (err) {
      console.warn(`Skipping user ${uid}:`, err.message);
    }
  }
}

function showModal(index) {
  currentIndex = index;
  modalImg.src = imageList[currentIndex].url;
  modal.style.display = "flex";
}

modalClose.onclick = () => {
  modal.style.display = "none";
};

modalPrev.onclick = () => {
  currentIndex = (currentIndex - 1 + imageList.length) % imageList.length;
  modalImg.src = imageList[currentIndex].url;
};

modalNext.onclick = () => {
  currentIndex = (currentIndex + 1) % imageList.length;
  modalImg.src = imageList[currentIndex].url;
};
