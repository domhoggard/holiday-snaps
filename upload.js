import { auth, storage, db, logOut } from './firebase.js';
import {
  ref,
  uploadBytes
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';
import {
  getDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

let filesData = [];

document.addEventListener("DOMContentLoaded", () => {
  const resortInput = document.getElementById("resort-name");
  const fileInput   = document.getElementById("file-input");
  const previewGrid = document.getElementById("preview-grid");
  const submitBtn   = document.getElementById("submit-btn");
  const logoutLink  = document.getElementById("logout-link");

  // wire up log-out
  logoutLink.addEventListener("click", e => {
    e.preventDefault();
    logOut();
  });

  // ensure user is logged in
  onAuthStateChanged(auth, user => {
    if (!user) location.href = "login.html";
  });

  // when files are chosen, build a preview card for each
  fileInput.addEventListener("change", () => {
    previewGrid.innerHTML = "";
    filesData = [];

    Array.from(fileInput.files).forEach((file, i) => {
      const card = document.createElement("div");
      card.className = "preview-card";

      // thumbnail
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      card.appendChild(img);

      // date picker
      const dateInput = document.createElement("input");
      dateInput.type = "date";
      dateInput.required = true;
      card.appendChild(dateInput);

      // default-privacy badge
      const badge = document.createElement("span");
      badge.className = "badge public";
      badge.textContent = "public";
      card.appendChild(badge);

      // overlay container
      const overlay = document.createElement("div");
      overlay.className = "overlay";

      // trash button
      const delBtn = document.createElement("button");
      delBtn.className = "trash";
      delBtn.innerHTML = `<img src="icons/trash.png" alt="Delete">`;
      delBtn.onclick = e => {
        e.stopPropagation();
        // remove from filesData
        filesData = filesData.filter(f => f.card !== card);
        card.remove();
      };
      overlay.appendChild(delBtn);

      // privacy choices
      ["public","friends","private"].forEach(choice => {
        const span = document.createElement("span");
        span.className = choice;
        span.textContent = choice;
        span.onclick = e => {
          e.stopPropagation();
          // update badge
          badge.textContent = choice;
          badge.className = `badge ${choice}`;
          // update filesData entry
          const entry = filesData.find(f => f.card === card);
          if (entry) entry.privacy = choice;
        };
        overlay.appendChild(span);
      });

      card.appendChild(overlay);
      previewGrid.appendChild(card);

      // remember this file
      filesData.push({
        file,
        dateInput,
        privacy: "public",
        card
      });
    });
  });

  // on submit, upload each file with its chosen date & privacy
  submitBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");

    const resort = resortInput.value.trim();
    if (!resort) return alert("Enter a resort name.");

    if (!filesData.length) {
      return alert("No files selected.");
    }

    // fetch friends list once
    let friendsList = [];
    try {
      const udoc = await getDoc(doc(db, "users", user.uid));
      friendsList = udoc.exists() ? (udoc.data().friends || []) : [];
    } catch {
      console.warn("Could not load friends for metadata.");
    }

    // upload loop
    for (let {file, dateInput, privacy} of filesData) {
      const date = dateInput.value;
      if (!date) {
        return alert("Select a date for each photo.");
      }

      // HEIC→JPEG on mobile
      const ext = file.name.split('.').pop().toLowerCase();
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (ext === "heic" && !isMobile) {
        alert("HEIC not supported on desktop. Convert or use mobile.");
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
        } catch {
          return alert("HEIC conversion failed for " + file.name);
        }
      }

      // build path & metadata
      const path = `${user.uid}/${resort}/${date}/${privacy}/${file.name}`;
      const storageRef = ref(storage, path);
      const metadata = {
        customMetadata: {
          owner: user.uid,
          privacy,
          friends: privacy === "friends" ? JSON.stringify(friendsList) : ""
        }
      };

      try {
        await uploadBytes(storageRef, file, metadata);
      } catch (err) {
        console.error("Upload failed for", file.name, err);
        alert("Failed to upload " + file.name);
        return;
      }
    }

    alert("All photos uploaded!");
    // clear form
    previewGrid.innerHTML = "";
    fileInput.value = "";
    resortInput.value = "";
    filesData = [];
  });
});

