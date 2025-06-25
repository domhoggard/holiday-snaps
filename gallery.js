import { auth, storage, db } from './firebase.js';
import { ref, listAll, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';
import { collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

const gallery      = document.getElementById('photo-gallery');
const startInput   = document.getElementById('startDate');
const endInput     = document.getElementById('endDate');
const filterBtn    = document.getElementById('filterBtn');
const modal        = document.getElementById("modal");
const modalImg     = document.getElementById("modal-img");
const modalClose   = document.getElementById("modal-close");
const modalPrev    = document.getElementById("modal-prev");
const modalNext    = document.getElementById("modal-next");

let imageList = [], currentIndex = 0, currentUserId = null, friendIds = [];

// read URL parameters
const params       = new URLSearchParams(window.location.search);
const resortFilter = params.get('resort');
const startParam   = params.get('start');
const endParam     = params.get('end');

// if present, seed the form
if (startParam) startInput.value = startParam;
if (endParam)   endInput.value   = endParam;

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }
  currentUserId = user.uid;
  const me       = await getDoc(doc(db, "users", user.uid));
  friendIds      = me.exists() ? me.data().friends || [] : [];

  // if URL had any params, auto-load once
  if (resortFilter || startParam || endParam) {
    loadPhotos();
  }
});

filterBtn.addEventListener('click', loadPhotos);

async function loadPhotos() {
  gallery.innerHTML = "";
  imageList = [];

  // use defaults so missing start/end means “all dates”
  const start = startInput.value  || "0000-01-01";
  const end   = endInput.value    || "9999-12-31";

  const usersSnapshot = await getDocs(collection(db, "users"));
  for (let uDoc of usersSnapshot.docs) {
    const uid     = uDoc.id;
    const isOwner = uid === currentUserId;
    const isFriend= friendIds.includes(uid);

    try {
      const userRef     = ref(storage, uid);
      const resortList  = await listAll(userRef);
      for (let resortFolder of resortList.prefixes) {
        const name = resortFolder.name;
        // honor resortFilter if given
        if (resortFilter && name !== resortFilter) continue;

        const dateList = await listAll(resortFolder);
        for (let dateFolder of dateList.prefixes) {
          const date = dateFolder.name;
          if (date < start || date > end) continue;

          const privacyList = await listAll(dateFolder);
          for (let privacyFolder of privacyList.prefixes) {
            const privacy = privacyFolder.name;
            const canView =
              privacy === "public" ||
              (privacy === "friends" && (isOwner || isFriend)) ||
              (privacy === "private" && isOwner);

            if (!canView) continue;

            const images = await listAll(privacyFolder);
            for (let item of images.items) {
              const url = await getDownloadURL(item);
              imageList.push({ url, privacy });

              // build the thumbnail card
              const card = document.createElement("div");
              card.className = "photo-card";

              const img = document.createElement("img");
              img.src       = url;
              img.alt       = "Photo";
              img.className = "gallery-img";
              const idx     = imageList.length - 1;
              img.addEventListener("click", () => showModal(idx));

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
    } catch (err) {
      console.warn(`Skipping user ${uid}: ${err.message}`);
    }
  }
}

function showModal(i) {
  currentIndex      = i;
  modalImg.src      = imageList[i].url;
  modal.style.display = "flex";
}
modalClose.onclick = () => modal.style.display = "none";
modalPrev.onclick  = () => {
  currentIndex = (currentIndex - 1 + imageList.length) % imageList.length;
  modalImg.src = imageList[currentIndex].url;
};
modalNext.onclick  = () => {
  currentIndex = (currentIndex + 1) % imageList.length;
  modalImg.src = imageList[currentIndex].url;
};
