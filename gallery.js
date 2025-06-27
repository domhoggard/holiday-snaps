// gallery.js – parallel folder listing + deferred URL fetch on scroll (lazy-load)

import { auth, storage, db, logOut } from "./firebase.js";
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

// expose logout for onclick
window.logOut = logOut;

// element refs
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

let imageList    = [];   // holds { itemRef, privacy, url? }
let currentIndex = 0;
let currentUser  = null;
let friendIds    = [];
let resortParam  = null;

// helper: get URL param
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Deferred thumbnail loader
const thumbObserver = new IntersectionObserver(entries => {
  entries.forEach(async entry => {
    if (!entry.isIntersecting) return;
    const img = entry.target;
    const idx = img.dataset.idx;
    const photo = imageList[idx];
    // fetch URL once
    if (!photo.url) {
      photo.url = await getDownloadURL(photo.itemRef);
    }
    img.src = photo.url;
    thumbObserver.unobserve(img);
  });
}, { rootMargin: "200px" });

// Open modal at index
function openModalAt(idx) {
  currentIndex = idx;
  const photo = imageList[idx];
  // ensure URL is loaded
  if (photo.url) {
    modalImg.src = photo.url;
    modal.style.display = "flex";
  } else {
    // load then show
    getDownloadURL(photo.itemRef).then(url => {
      photo.url = url;
      modalImg.src = url;
      modal.style.display = "flex";
    });
  }
}

// Change privacy in-place
async function changePrivacy(itemRef, newPriv, badgeEl, selectorEl) {
  const m = itemRef.fullPath.match(/\/(public|friends|private)\//);
  const oldPriv = m && m[1];
  if (!oldPriv || oldPriv === newPriv) return;
  const meta = await getMetadata(itemRef);
  const bytes = await getBytes(itemRef);
  const newPath = itemRef.fullPath.replace(`/${oldPriv}/`, `/${newPriv}/`);
  const newRef  = ref(storage, newPath);
  await uploadBytes(newRef, bytes, {
    contentType: meta.contentType,
    customMetadata: meta.customMetadata
  });
  await deleteObject(itemRef);
  // update badge
  badgeEl.textContent = newPriv;
  badgeEl.className   = `badge ${newPriv}`;
  selectorEl.remove();
}

// Populate saved trips dropdown
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

// Main loader: list all itemRefs first, then render placeholders
async function loadPhotos(start, end, resortFilter = null) {
  gallery.innerHTML = "";
  imageList = [];

  const usersSnap = await getDocs(collection(db, "users"));
  // For each user, gather their itemRefs
  await Promise.all(usersSnap.docs.map(async uDoc => {
    const uid       = uDoc.id;
    const isOwner   = uid === currentUser.uid;
    const isFriend  = friendIds.includes(uid);
    const userFold  = ref(storage, uid);
    try {
      const { prefixes: resorts } = await listAll(userFold);
      await Promise.all(resorts.map(async rf => {
        if (resortFilter && rf.name !== resortFilter) return;
        const { prefixes: dates } = await listAll(rf);
        await Promise.all(dates.map(async df => {
          if (df.name < start || df.name > end) return;
          const { prefixes: privs } = await listAll(df);
          await Promise.all(privs.map(async pf => {
            const priv = pf.name;
            const ok = priv === "public"
              || (priv === "friends" && (isOwner || isFriend))
              || (priv === "private" && isOwner);
            if (!ok) return;
            const { items } = await listAll(pf);
            items.forEach(itemRef => {
              // queue photo
              imageList.push({ itemRef, privacy: priv });
            });
          }));
        }));
      }));
    } catch (e) {
      console.warn(`Skipping ${uid}:`, e);
    }
  }));

  // Now render one placeholder card per photo, in sequence:
  imageList.forEach((photo, idx) => {
    const card = document.createElement("div");
    card.className = "photo-card";
    card.onclick   = () => openModalAt(idx);

    // placeholder img
    const img = document.createElement("img");
    img.dataset.idx = idx;
    img.alt        = "Loading…";
    img.className  = "gallery-img";
    // starts empty; thumbObserver will fill src when visible
    thumbObserver.observe(img);

    // badge
    const badge = document.createElement("span");
    badge.className = `badge ${photo.privacy}`;
    badge.textContent = photo.privacy;

    card.append(img, badge);

    // owner controls
    if (photo.itemRef.fullPath.startsWith(currentUser.uid + "/")) {
      const overlay = document.createElement("div");
      overlay.className = "overlay";

      // delete
      const delBtn = document.createElement("button");
      delBtn.title     = "Delete";
      delBtn.innerHTML = `<img src="icons/trash.png" alt="Del"/>`;
      delBtn.onclick = async e => {
        e.stopPropagation();
        if (!confirm("Delete this photo?")) return;
        await deleteObject(photo.itemRef);
        card.remove();
        imageList.splice(idx, 1);
      };

      // privacy toggles
      const selector = document.createElement("div");
      selector.className = "privacy-selector";
      ["public","friends","private"].forEach(choice => {
        if (choice === photo.privacy) return;
        const span = document.createElement("span");
        span.className = `privacy-toggle ${choice}`;
        span.textContent = choice;
        span.onclick = e => {
          e.stopPropagation();
          changePrivacy(photo.itemRef, choice, badge, selector);
        };
        selector.appendChild(span);
      });

      overlay.append(delBtn, selector);
      card.appendChild(overlay);
    }

    gallery.appendChild(card);
  });
}

// INITIALIZATION
onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }
  currentUser = user;
  resortParam = getParam("resort");

  // fill trips select
  await populateSavedTrips();

  // if params present, auto-load
  const s = getParam("start"), e = getParam("end");
  if (resortParam && s && e) {
    startDateInput.value = s;
    endDateInput.value   = e;
    await loadPhotos(s, e, resortParam);
  }

  // load friend IDs
  const meSnap = await getDoc(doc(db, "users", user.uid));
  friendIds = meSnap.data().friends || [];

  // bind controls
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
    populateSavedTrips();
  };
  loadTripBtn.onclick = () => {
    const sel = tripsSelect.value;
    if (!sel) return alert("Pick a saved trip");
    const { resort, start, end } = JSON.parse(sel);
    startDateInput.value = start;
    endDateInput.value   = end;
    loadPhotos(start, end, resort);
  };

  // modal nav
  modalClose.onclick = () => modal.style.display = "none";
  modalPrev.onclick  = () => openModalAt((currentIndex - 1 + imageList.length) % imageList.length);
  modalNext.onclick  = () => openModalAt((currentIndex + 1) % imageList.length);
});
