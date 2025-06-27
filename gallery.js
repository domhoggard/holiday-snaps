// gallery.js – optimized gallery with parallel loading, lazy‐load, in‐place updates

import { auth, storage, db, logOut } from './firebase.js';
import {
  ref,
  listAll,
  getDownloadURL,
  deleteObject,
  uploadBytes,
  getMetadata,
  getBytes
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

// expose logout for onclick in HTML
window.logOut = logOut;

// DOM refs
const gallery        = document.getElementById("photo-gallery");
const startDateInput = document.getElementById("startDate");
const endDateInput   = document.getElementById("endDate");
const filterBtn      = document.getElementById("filterBtn");
const saveBtn        = document.getElementById("saveCurrentTripBtn");
const loadTripBtn    = document.getElementById("loadSavedTripBtn");
const tripsSelect    = document.getElementById("savedTripsSelect");
const modal          = document.getElementById("modal");
const modalImg       = document.getElementById("modal-img");
const modalClose     = document.getElementById("modal-close");
const modalPrev      = document.getElementById("modal-prev");
const modalNext      = document.getElementById("modal-next");

let imageList    = [];
let currentIndex = 0;
let currentUser  = null;
let friendIds    = [];
let resortParam  = null;

// helper to read URL params
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// lazy‐load observer
const lazyLoadObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const img = entry.target;
    img.src = img.dataset.src;
    lazyLoadObserver.unobserve(img);
  });
}, { rootMargin: "200px" });

// open modal at a given index
function openModalAt(idx) {
  currentIndex = idx;
  modalImg.src = imageList[idx].url;
  modal.style.display = "flex";
}

// handle privacy change (moves file between folders)
async function changePrivacy(itemRef, newPrivacy) {
  const m = itemRef.fullPath.match(/\/(public|friends|private)\//);
  const oldPrivacy = m ? m[1] : null;
  if (!oldPrivacy || oldPrivacy === newPrivacy) return;

  const meta     = await getMetadata(itemRef);
  const bytes    = await getBytes(itemRef);
  const newPath  = itemRef.fullPath.replace(`/${oldPrivacy}/`, `/${newPrivacy}/`);
  const newRef   = ref(storage, newPath);

  await uploadBytes(newRef, bytes, {
    contentType: meta.contentType,
    customMetadata: meta.customMetadata
  });
  await deleteObject(itemRef);
}

// populate saved trips dropdown
async function populateSavedTrips() {
  tripsSelect.innerHTML = `<option value="">-- Select a saved trip --</option>`;
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  (snap.data().savedTrips || []).forEach(trip => {
    const o = document.createElement("option");
    o.value       = JSON.stringify(trip);
    o.textContent = `${trip.resort}: ${trip.start} → ${trip.end}`;
    tripsSelect.appendChild(o);
  });
}

// optimized, parallel & progressive photo loading
async function loadPhotos(start, end, resortFilter = null) {
  gallery.innerHTML = "";
  imageList = [];

  // get all users once
  const usersSnap = await getDocs(collection(db, "users"));
  await Promise.all(usersSnap.docs.map(uDoc => processUser(uDoc.id)));

  // helper: process one user's folder tree
  async function processUser(uid) {
    const isOwner  = uid === currentUser.uid;
    const isFriend = friendIds.includes(uid);
    const userFolder = ref(storage, uid);

    try {
      const { prefixes: resorts } = await listAll(userFolder);
      await Promise.all(resorts.map(async rf => {
        if (resortFilter && rf.name !== resortFilter) return;
        const { prefixes: dates } = await listAll(rf);
        await Promise.all(dates.map(async df => {
          if (df.name < start || df.name > end) return;
          const { prefixes: privs } = await listAll(df);
          await Promise.all(privs.map(async pf => {
            const privacy = pf.name;
            const ok = privacy === "public"
                    || (privacy === "friends" && (isOwner || isFriend))
                    || (privacy === "private" && isOwner);
            if (!ok) return;
            const { items } = await listAll(pf);
            await Promise.all(items.map(itemRef => appendCard(itemRef, privacy)));
          }));
        }));
      }));
    } catch (err) {
      console.warn(`Skipping user ${uid}:`, err);
    }
  }

  // build & append a card as soon as we have its URL
  async function appendCard(itemRef, privacy) {
    const url = await getDownloadURL(itemRef);
    const idx = imageList.length;
    const photo = { url, privacy, itemRef };
    imageList.push(photo);

    // card container
    const card = document.createElement("div");
    card.className = "photo-card";
    card.onclick = () => openModalAt(idx);

    // thumbnail (lazy)
    const img = document.createElement("img");
    img.dataset.src = url;
    img.className   = "gallery-img";

    // privacy badge
    const badge = document.createElement("span");
    badge.className = `badge ${privacy}`;
    badge.textContent = privacy;

    card.append(img, badge);

    // owner overlay
    if (itemRef.fullPath.startsWith(`${currentUser.uid}/`)) {
      const overlay = document.createElement("div");
      overlay.className = "overlay";

      // delete button
      const delBtn = document.createElement("button");
      delBtn.title     = "Delete photo";
      delBtn.innerHTML = `<img src="icons/trash.png" alt="Del"/>`;
      delBtn.onclick = async e => {
        e.stopPropagation();
        if (!confirm("Delete this photo?")) return;
        await deleteObject(itemRef);
        card.remove();
        imageList.splice(idx, 1);
      };

      // privacy toggles
      const selector = document.createElement("div");
      selector.className = "privacy-selector";
      ["public","friends","private"].forEach(choice => {
        if (choice === privacy) return;
        const span = document.createElement("span");
        span.className = `privacy-toggle ${choice}`;
        span.textContent = choice;
        span.onclick = async e => {
          e.stopPropagation();
          await changePrivacy(itemRef, choice);
          badge.textContent    = choice;
          badge.className      = `badge ${choice}`;
          selector.remove();
        };
        selector.appendChild(span);
      });

      overlay.append(delBtn, selector);
      card.appendChild(overlay);
    }

    gallery.appendChild(card);
    lazyLoadObserver.observe(img);
  }
}

// auth & init
onAuthStateChanged(auth, async user => {
  if (!user) return location.href = "login.html";
  currentUser = user;
  resortParam = getParam("resort");

  await populateSavedTrips();

  // URL-driven load
  const s = getParam("start"), e = getParam("end");
  if (resortParam && s && e) {
    startDateInput.value = s;
    endDateInput.value   = e;
    await loadPhotos(s, e, resortParam);
  }

  // get friends list
  const meSnap = await getDoc(doc(db, "users", user.uid));
  friendIds = meSnap.data().friends || [];

  // event bindings
  filterBtn.onclick = () => {
    const s = startDateInput.value, e = endDateInput.value;
    if (!s || !e) return alert("Select both dates");
    loadPhotos(s, e, resortParam);
  };
  saveBtn.onclick = async () => {
    if (!resortParam) return alert("No resort to save");
    const s = startDateInput.value, e = endDateInput.value;
    if (!s || !e) return alert("Select dates");
    await updateDoc(doc(db, "users", user.uid), {
      savedTrips: arrayUnion({ resort: resortParam, start: s, end: e })
    });
    alert("Saved!");
    await populateSavedTrips();
  };
  loadTripBtn.onclick = () => {
    const sel = tripsSelect.value;
    if (!sel) return alert("Pick a saved trip");
    const { resort, start, end } = JSON.parse(sel);
    startDateInput.value = start;
    endDateInput.value   = end;
    loadPhotos(start, end, resort);
  };

  modalClose.onclick = () => modal.style.display = "none";
  modalPrev.onclick  = () => openModalAt((currentIndex - 1 + imageList.length) % imageList.length);
  modalNext.onclick  = () => openModalAt((currentIndex + 1) % imageList.length);
});


