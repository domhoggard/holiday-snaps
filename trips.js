import { auth, storage, db, logOut } from './firebase.js';
import { ref, uploadBytes, listAll } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn      = document.getElementById("uploadBtn");
  const resortList     = document.getElementById("resort-list");
  const logoutLink     = document.getElementById("logout-link");
  const selectAllRes   = document.getElementById("search-resort");
  const searchStart    = document.getElementById("search-startDate");
  const searchEnd      = document.getElementById("search-endDate");
  const searchAllBtn   = document.getElementById("searchAllBtn");

  // existing log out
  logoutLink.addEventListener("click", e => {
    e.preventDefault();
    logOut();
  });

  onAuthStateChanged(auth, async user => {
    if (!user) {
      location.href = "login.html";
      return;
    }

    // 1) populate “My Resorts”
    await listResorts(user.uid);

    // 2) populate the “All Resorts” selector
    await listAllResorts();

    // 3) bind the new search button
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

    // 4) bind upload (unchanged)
    if (uploadBtn) {
      uploadBtn.addEventListener("click", async () => {
        /* … your existing upload handler … */
      });
    }
  });

  // existing function to load *your* resorts
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

  // NEW: scan *all* users’ top-level prefixes for resort names
  async function listAllResorts() {
    selectAllRes.innerHTML = '<option value="">-- Select a resort --</option>';
    const set = new Set();
    try {
      const rootRef = ref(storage, "");
      const users  = await listAll(rootRef);
      for (let u of users.prefixes) {
        try {
          const resorts = await listAll(u);
          resorts.prefixes.forEach(r => set.add(r.name));
        } catch (_) { /*ignore errors per user*/ }
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
