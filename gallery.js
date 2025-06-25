import { auth, storage, db } from './firebase.js';
import {
  ref, listAll, getDownloadURL,
  deleteObject, updateMetadata
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';
import {
  collection, getDocs, doc, getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

const gallery      = document.getElementById('photo-gallery');
const startDateIn  = document.getElementById('startDate');
const endDateIn    = document.getElementById('endDate');
const filterBtn    = document.getElementById('filterBtn');
const modal        = document.getElementById("modal");
const modalImg     = document.getElementById("modal-img");
const modalClose   = document.getElementById("modal-close");
const modalPrev    = document.getElementById("modal-prev");
const modalNext    = document.getElementById("modal-next");

let imageList = [], currentIndex = 0;
let currentUserId = null, friendIds = [];

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId = user.uid;
    const userDoc = await getDoc(doc(db, "users", currentUserId));
    if (userDoc.exists()) friendIds = userDoc.data().friends || [];
  } else {
    location.href = "login.html";
  }
});

filterBtn.addEventListener('click', async () => {
  const s = startDateIn.value, e = endDateIn.value;
  if (!s || !e) return alert("Please select both dates.");
  await loadPhotos(s, e);
});

async function loadPhotos(start, end) {
  gallery.innerHTML = "";
  imageList = [];

  const users = await getDocs(collection(db, "users"));
  for (let u of users.docs) {
    const uid     = u.id;
    const isOwner = uid === currentUserId;
    const isFriend= friendIds.includes(uid);

    try {
      const resorts = await listAll(ref(storage, uid));
      for (let resortFolder of resorts.prefixes) {
        const dates = await listAll(resortFolder);
        for (let dateFolder of dates.prefixes) {
          const date = dateFolder.name;
          if (date < start || date > end) continue;

          const privs = await listAll(dateFolder);
          for (let pFolder of privs.prefixes) {
            const privacy = pFolder.name;
            const canView = 
              privacy === "public" ||
              (privacy === "friends" && (isOwner||isFriend)) ||
              (privacy === "private" && isOwner);

            if (!canView) continue;

            const items = await listAll(pFolder);
            for (let item of items.items) {
              const url = await getDownloadURL(item);
              const idx = imageList.length;
              imageList.push({ url, privacy, item });

              // build card
              const card = document.createElement("div");
              card.className = "photo-card";

              const img = document.createElement("img");
              img.src       = url;
              img.alt       = "Photo";
              img.className = "gallery-img";
              img.addEventListener("click", () => showModal(idx));

              const badge = document.createElement("span");
              badge.className = "badge " + privacy;
              badge.textContent = privacy.charAt(0).toUpperCase() + privacy.slice(1);

              // overlay
              const overlay = document.createElement("div");
              overlay.className = "card-overlay";

              // delete
              const delBtn = document.createElement("button");
              delBtn.className = "delete-btn";
              delBtn.innerHTML = "🗑️";
              delBtn.title     = "Delete this photo";
              delBtn.addEventListener("click", async e => {
                e.stopPropagation();
                if (!confirm("Delete this photo?")) return;
                try {
                  await deleteObject(item);
                  card.remove();
                  alert("Deleted.");
                } catch (err) {
                  console.error(err);
                  alert("Delete failed.");
                }
              });

              // privacy selector
              const sel = document.createElement("select");
              ["public","friends","private"].forEach(opt => {
                const o = document.createElement("option");
                o.value = opt;
                o.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
                if (opt === privacy) o.selected = true;
                sel.appendChild(o);
              });
              sel.addEventListener("change", async e => {
                const newPriv = e.target.value;
                try {
                  const md = (await item.getMetadata()).customMetadata || {};
                  md.privacy = newPriv;
                  await updateMetadata(item, { customMetadata: md });
                  badge.textContent = newPriv.charAt(0).toUpperCase() + newPriv.slice(1);
                  badge.className = "badge " + newPriv;
                  alert("Privacy updated.");
                } catch (err) {
                  console.error(err);
                  alert("Could not update privacy.");
                }
              });

              overlay.appendChild(delBtn);
              overlay.appendChild(sel);

              // assemble
              card.appendChild(img);
              card.appendChild(badge);
              card.appendChild(overlay);
              gallery.appendChild(card);
            }
          }
        }
      }
    } catch (_) {
      console.warn(`Skipping user ${uid}`);
    }
  }
}

function showModal(i) {
  currentIndex = i;
  modalImg.src = imageList[i].url;
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
