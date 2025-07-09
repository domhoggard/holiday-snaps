// gallery.js
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

window.logOut = logOut;

// panels
const yourGallery    = document.getElementById("your-photos");
const friendsGallery= document.getElementById("friends-photos");
const publicGallery = document.getElementById("public-photos");

// date & trip controls
const startDateInput = document.getElementById("startDate");
const endDateInput   = document.getElementById("endDate");
const filterBtn      = document.getElementById("filterBtn");
const saveBtn        = document.getElementById("saveCurrentTripBtn");
const loadTripBtn    = document.getElementById("loadSavedTripBtn");
const tripsSelect    = document.getElementById("savedTripsSelect");

// modal elements
const modal      = document.getElementById("modal");
const modalImg   = document.getElementById("modal-img");
const modalClose = document.getElementById("modal-close");
const modalPrev  = document.getElementById("modal-prev");
const modalNext  = document.getElementById("modal-next");

let imageList    = [];   // { thumbRef, fullRef, privacy, owner, friendOK }
let currentIndex = 0;
let currentUser  = null;
let friendIds    = [];
let resortParam  = null;

// for lazy-loading thumbnails
const thumbObserver = new IntersectionObserver(entries => {
  entries.forEach(async entry => {
    if (!entry.isIntersecting) return;
    const img = entry.target;
    const idx = img.dataset.idx;
    const photo = imageList[idx];
    if (!photo.thumbUrl) {
      photo.thumbUrl = await getDownloadURL(photo.thumbRef);
    }
    img.src = photo.thumbUrl;
    thumbObserver.unobserve(img);
  });
}, { rootMargin: "200px" });

// open full image in modal
function openModalAt(idx) {
  currentIndex = idx;
  const photo = imageList[idx];
  if (photo.fullUrl) {
    modalImg.src = photo.fullUrl;
    modal.style.display = "flex";
  } else {
    getDownloadURL(photo.fullRef).then(url => {
      photo.fullUrl = url;
      modalImg.src = url;
      modal.style.display = "flex";
    });
  }
}

// change privacy of both thumb and full
async function changePrivacy(fullRef, thumbRef, newPriv, badgeEl, selectorEl) {
  const m = fullRef.fullPath.match(/\/(public|friends|private)\//);
  const oldPriv = m && m[1];
  if (!oldPriv || oldPriv === newPriv) return;

  const [fullMeta, thumbMeta] = await Promise.all([
    getMetadata(fullRef),
    getMetadata(thumbRef)
  ]);
  const [fullBytes, thumbBytes] = await Promise.all([
    getBytes(fullRef),
    getBytes(thumbRef)
  ]);

  const newFullPath  = fullRef.fullPath.replace(`/${oldPriv}/`, `/${newPriv}/`);
  const newThumbPath = thumbRef.fullPath.replace(`/${oldPriv}/`, `/${newPriv}/`);
  const newFullRef   = ref(storage, newFullPath);
  const newThumbRef  = ref(storage, newThumbPath);

  await uploadBytes(newFullRef, fullBytes, {
    contentType: fullMeta.contentType,
    customMetadata: fullMeta.customMetadata
  });
  await uploadBytes(newThumbRef, thumbBytes, {
    contentType: thumbMeta.contentType,
    customMetadata: thumbMeta.customMetadata
  });
  await deleteObject(fullRef);
  await deleteObject(thumbRef);

  badgeEl.textContent = newPriv;
  badgeEl.className   = `badge ${newPriv}`;
  selectorEl.remove();

  // update our in-memory refs
  const photo = imageList.find(p => p.fullRef.fullPath === fullRef.fullPath);
  if (photo) {
    photo.fullRef  = newFullRef;
    photo.thumbRef = newThumbRef;
  }
}

// pull in saved trips
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

// main loader
async function loadPhotos(start, end, resortFilter = null) {
  // clear panels
  yourGallery.innerHTML    = "";
  friendsGallery.innerHTML = "";
  publicGallery.innerHTML  = "";
  imageList = [];

  const usersSnap = await getDocs(collection(db, "users"));
  await Promise.all(usersSnap.docs.map(async uDoc => {
    const uid      = uDoc.id;
    const isOwner  = uid === currentUser.uid;
    const isFriend = friendIds.includes(uid);
    const userFold = ref(storage, uid);
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
            // group thumb_ vs full
            const grouped = {};
            items.forEach(itemRef => {
              const nm = itemRef.name;
              const base = nm.replace(/^thumb_/, "");
              if (!grouped[base]) grouped[base] = {};
              if (nm.startsWith("thumb_")) grouped[base].thumbRef = itemRef;
              else                          grouped[base].fullRef  = itemRef;
            });
            Object.values(grouped).forEach(g => {
              if (g.fullRef) {
                imageList.push({
                  thumbRef: g.thumbRef  || g.fullRef,
                  fullRef:  g.fullRef,
                  privacy:  priv,
                  owner:    isOwner,
                  friendOK: isFriend
                });
              }
            });
          }));
        }));
      }));
    } catch (e) {
      console.warn(`Skipping ${uid}:`, e);
    }
  }));

  // render in three panels
  imageList.forEach((photo, idx) => {
    const card = document.createElement("div");
    card.className = "photo-card";
    card.onclick   = () => openModalAt(idx);

    // placeholder img for lazy-load
    const img = document.createElement("img");
    img.dataset.idx = idx;
    img.alt        = "Loading…";
    img.className  = "gallery-img";
    thumbObserver.observe(img);

    // badge
    const badge = document.createElement("span");
    badge.className = `badge ${photo.privacy}`;
    badge.textContent = photo.privacy;

    card.append(img, badge);

    // owner-only controls
    if (photo.owner) {
      const overlay = document.createElement("div");
      overlay.className = "overlay";

      // delete both full and thumb
      const delBtn = document.createElement("button");
      delBtn.title     = "Delete";
      delBtn.innerHTML = `<img src="icons/trash.png" alt="Del"/>`;
      delBtn.onclick = async e => {
        e.stopPropagation();
        if (!confirm("Delete this photo?")) return;
        await deleteObject(photo.fullRef);
        // only delete thumb if different
        if (photo.thumbRef.fullPath !== photo.fullRef.fullPath) {
          await deleteObject(photo.thumbRef);
        }
        card.remove();
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
          changePrivacy(photo.fullRef, photo.thumbRef, choice, badge, selector);
        };
        selector.appendChild(span);
      });

      overlay.append(delBtn, selector);
      card.appendChild(overlay);
    }

    // append to correct panel
    if (photo.owner) {
      yourGallery.appendChild(card);
    } else if (photo.privacy === "friends") {
      friendsGallery.appendChild(card);
    } else if (photo.privacy === "public") {
      publicGallery.appendChild(card);
    }
  });
}

// INITIALIZATION
onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }
  currentUser = user;
  resortParam = new URLSearchParams(window.location.search).get("resort");

  await populateSavedTrips();

  const s = new URLSearchParams(window.location.search).get("start");
  const e = new URLSearchParams(window.location.search).get("end");
  if (resortParam && s && e) {
    startDateInput.value = s;
    endDateInput.value   = e;
    await loadPhotos(s, e, resortParam);
  }

  const meSnap = await getDoc(doc(db, "users", user.uid));
  friendIds = meSnap.data().friends || [];

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

  modalClose.onclick = () => modal.style.display = "none";
  modalPrev.onclick  = () => openModalAt((currentIndex - 1 + imageList.length) % imageList.length);
  modalNext.onclick  = () => openModalAt((currentIndex + 1) % imageList.length);
});
