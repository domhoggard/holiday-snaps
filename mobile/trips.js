console.log("🟢 trips.js loaded");

import { auth, storage, db, logOut } from './firebase.js';
import {
  ref,
  uploadBytes,
  listAll
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn      = document.getElementById("uploadBtn");
  const resortList     = document.getElementById("resort-list");
  const logoutLink     = document.getElementById("logout-link");
  const selectAllRes   = document.getElementById("search-resort");
  const searchStart    = document.getElementById("search-startDate");
  const searchEnd      = document.getElementById("search-endDate");
  const searchAllBtn   = document.getElementById("searchAllBtn");
  const saveTripBtn    = document.getElementById("saveTripBtn");
  const savedTripsList = document.getElementById("saved-trips");

  // Log out
  logoutLink.addEventListener("click", e => {
    e.preventDefault();
    logOut();
  });

  onAuthStateChanged(auth, async user => {
    if (!user) {
      location.href = "login.html";
      return;
    }

    // 1) My Resorts
    await listResorts(user.uid);

    // 2) All Resorts dropdown
    await listAllResorts();

    // 3) Saved Trips UI
    await listSavedTrips(user.uid);

    // 4) “View in Gallery”
    searchAllBtn.addEventListener("click", () => {
      const resort = selectAllRes.value;
      if (!resort) return alert("Please select a resort.");
      let url = `gallery.html?resort=${encodeURIComponent(resort)}`;
      if (searchStart.value) url += `&start=${searchStart.value}`;
      if (searchEnd.value)   url += `&end=${searchEnd.value}`;
      window.location.href = url;
    });

    // 5) “Save Trip” button
    saveTripBtn.addEventListener("click", async () => {
      const resort = selectAllRes.value;
      const start  = searchStart.value;
      const end    = searchEnd.value;
      if (!resort || !start || !end) {
        return alert("Please select resort & both dates to save.");
      }
      const userRef = doc(db, "users", user.uid);
      const tripObj = { resort, start, end };
      try {
        await updateDoc(userRef, {
          savedTrips: arrayUnion(tripObj)
        });
        alert("Trip saved!");
        await listSavedTrips(user.uid);
      } catch (e) {
        console.error("Saving trip failed:", e);
        alert("Failed to save trip.");
      }
    });

    // 6) Upload your photo (fully restored)
    if (uploadBtn) {
      uploadBtn.addEventListener("click", async () => {
        // — grab inputs —
        let file = document.getElementById("photo").files[0];
        const resort  = document.getElementById("resort").value.trim();
        const date    = document.getElementById("date").value;
        const privacy = document.getElementById("privacy").value;
        if (!file || !resort || !date) {
          return alert("Please fill in all fields.");
        }

        // — HEIC conversion on mobile —
        const ext = file.name.split('.').pop().toLowerCase();
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (ext === "heic" && !isMobile) {
          alert("HEIC files not supported on desktop. Use mobile or convert to JPG/PNG.");
          return;
        }
        if (ext === "heic") {
          try {
            const heic2any = (await import(
              'https://cdn.jsdelivr.net/npm/heic2any@0.0.3/dist/heic2any.min.js'
            )).default;
            const blob = await heic2any({ blob: file, toType: 'image/jpeg' });
            file = new File(
              [blob],
              file.name.replace(/\.heic$/, '.jpg'),
              { type: 'image/jpeg' }
            );
          } catch (e) {
            console.error("HEIC conversion failed:", e);
            return alert("HEIC conversion failed. Try another file.");
          }
        }

        // — build storage path & metadata —
        const filePath = `${user.uid}/${resort}/${date}/${privacy}/${file.name}`;
        const storageRef = ref(storage, filePath);
        let metadata = {
          customMetadata: {
            privacy: privacy,
            owner: user.uid
          }
        };
        if (privacy === "friends") {
          try {
            const udoc = await getDoc(doc(db, "users", user.uid));
            metadata.customMetadata.friends = JSON.stringify(
              udoc.data().friends || []
            );
          } catch (e) {
            console.warn("Couldn't fetch friends for metadata:", e);
          }
        }

        // — actually upload —
        try {
          await uploadBytes(storageRef, file, metadata);
          alert("Photo uploaded successfully!");
          await listResorts(user.uid);
        } catch (e) {
          console.error("Upload failed:", e);
          alert("Upload failed. See console for details.");
        }
      });
    }
  });

  // load *your* resort folders
  async function listResorts(uid) {
    resortList.innerHTML = "";
    try {
      const userRef = ref(storage, uid);
      const result  = await listAll(userRef);
      result.prefixes.forEach(folder => {
        const li   = document.createElement("li");
        const link = document.createElement("a");
        link.href = `gallery.html?resort=${encodeURIComponent(folder.name)}`;
        link.textContent = folder.name;
        li.appendChild(link);
        resortList.appendChild(li);
      });
    } catch (err) {
      console.error("Listing resorts failed:", err);
    }
  }

  // list *all* users’ resort names
  async function listAllResorts() {
    selectAllRes.innerHTML = '<option value="">-- Select a resort --</option>';
    const set = new Set();
    try {
      const rootRef = ref(storage, "");
      const users   = await listAll(rootRef);
      for (let u of users.prefixes) {
        try {
          const resorts = await listAll(u);
          resorts.prefixes.forEach(r => set.add(r.name));
        } catch (_) { /* ignore per-user errors */ }
      }
      Array.from(set).sort().forEach(name => {
        const o = document.createElement("option");
        o.value = name;
        o.textContent = name;
        selectAllRes.appendChild(o);
      });
    } catch (e) {
      console.error("Failed to list all resorts:", e);
    }
  }

  // render savedTrips array from Firestore
  async function listSavedTrips(uid) {
    savedTripsList.innerHTML = "";
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      const trips   = userDoc.exists() ? (userDoc.data().savedTrips || []) : [];
      trips.forEach(trip => {
        const li    = document.createElement("li");
        const label = document.createElement("span");
        label.textContent = `${trip.resort}: ${trip.start} → ${trip.end}`;

        // Load button
        const loadBtn = document.createElement("button");
        loadBtn.textContent = "Load";
        loadBtn.onclick = () => {
          let url = `gallery.html?resort=${encodeURIComponent(trip.resort)}`;
          url += `&start=${trip.start}&end=${trip.end}`;
          window.location.href = url;
        };

        // Delete button
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.onclick = async () => {
          try {
            await updateDoc(doc(db, "users", uid), {
              savedTrips: arrayRemove(trip)
            });
            await listSavedTrips(uid);
          } catch (e) {
            console.error("Deleting saved trip failed:", e);
            alert("Failed to delete saved trip.");
          }
        };

        li.append(label, loadBtn, delBtn);
        savedTripsList.appendChild(li);
      });
    } catch (e) {
      console.error("Loading saved trips failed:", e);
    }
  }
});

