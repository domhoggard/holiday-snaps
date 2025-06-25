import { auth, storage, db, logOut } from './firebase.js';
import {
  ref,
  uploadBytes,
  listAll
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';
import {
  getDoc,
  doc
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

  // 1) Log out
  logoutLink.addEventListener("click", e => {
    e.preventDefault();
    logOut();
  });

  // 2) Auth + initial loads
  onAuthStateChanged(auth, async user => {
    if (!user) {
      location.href = "login.html";
      return;
    }

    // load your saved trips
    await listResorts(user.uid);

    // populate drop-down of *all* resorts across everyone
    await listAllResorts();

    // wire up the new search button
    searchAllBtn.addEventListener("click", () => {
      const resort = selectAllRes.value;
      if (!resort) {
        alert("Please select a resort to view.");
        return;
      }
      let url = `gallery.html?resort=${encodeURIComponent(resort)}`;
      if (searchStart.value) url += `&start=${searchStart.value}`;
      if (searchEnd.value)   url += `&end=${searchEnd.value}`;
      window.location.href = url;
    });

    // wire up upload
    if (uploadBtn) {
      uploadBtn.addEventListener("click", async () => {
        // --- start of your existing upload logic ---
        let file = document.getElementById("photo").files[0];
        const resort = document.getElementById("resort").value.trim();
        const date = document.getElementById("date").value;
        const privacy = document.getElementById("privacy").value;
        if (!file || !resort || !date) {
          return alert("Please fill in all fields.");
        }

        const fileExtension = file.name.split('.').pop().toLowerCase();
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (fileExtension === "heic" && !isMobile) {
          alert("HEIC not supported on desktop. Convert or use mobile.");
          return;
        }

        if (fileExtension === "heic") {
          try {
            const heic2any = (await import(
              'https://cdn.jsdelivr.net/npm/heic2any@0.0.3/dist/heic2any.min.js'
            )).default;
            const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg' });
            file = new File(
              [convertedBlob],
              file.name.replace(/\.heic$/, '.jpg'),
              { type: 'image/jpeg' }
            );
          } catch (conversionError) {
            console.error("HEIC conversion failed:", conversionError);
            return alert("HEIC conversion failed.");
          }
        }

        // build path & metadata
        const filePath = `${user.uid}/${resort}/${date}/${privacy}/${file.name}`;
        const storageRef = ref(storage, filePath);
        let metadata = { customMetadata: { privacy, owner: user.uid } };

        if (privacy === "friends") {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const friendsArray = userDoc.exists() ? (userDoc.data().friends || []) : [];
            metadata.customMetadata.friends = JSON.stringify(friendsArray);
          } catch (err) {
            console.error("Fetching friends:", err);
          }
        }

        // upload
        try {
          await uploadBytes(storageRef, file, metadata);
          alert("Photo uploaded successfully!");
          // refresh your list
          await listResorts(user.uid);
        } catch (err) {
          console.error("Upload error:", err);
          alert("Upload failed.");
        }
        // --- end of your existing upload logic ---
      });
    }
  });

  // load just your resorts
  async function listResorts(uid) {
    resortList.innerHTML = "";
    try {
      const userRef = ref(storage, uid);
      const result  = await listAll(userRef);
      result.prefixes.forEach(folder => {
        const li = document.createElement("li");
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

  // list EVERYONE’s resort folders
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
});
