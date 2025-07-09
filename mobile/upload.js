// upload.js
import { auth, storage, db, logOut } from './firebase.js';
import { ref, uploadBytes } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

let filesData = [];

document.addEventListener("DOMContentLoaded", () => {
  const resortInput = document.getElementById("resort-name");
  const fileInput   = document.getElementById("file-input");
  const previewGrid = document.getElementById("preview-grid");
  const submitBtn   = document.getElementById("submit-btn");
  const logoutLink  = document.getElementById("logout-link");

  logoutLink.addEventListener("click", e => {
    e.preventDefault();
    logOut();
  });

  onAuthStateChanged(auth, user => {
    if (!user) location.href = "login.html";
  });

  // generate a thumbnail blob (max dimension 150px)
  function generateThumbnail(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxSize = 150;
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = height * (maxSize / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = width * (maxSize / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error("Thumbnail generation failed"));
        }, 'image/jpeg', 0.7);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  fileInput.addEventListener("change", () => {
    previewGrid.innerHTML = "";
    filesData = [];

    Array.from(fileInput.files).forEach((file, i) => {
      const card = document.createElement("div");
      card.className = "preview-card";

      // thumbnail preview (local)
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

      // overlay
      const overlay = document.createElement("div");
      overlay.className = "overlay";

      // trash
      const delBtn = document.createElement("button");
      delBtn.className = "trash";
      delBtn.innerHTML = `<img src="icons/trash.png" alt="Delete">`;
      delBtn.onclick = e => {
        e.stopPropagation();
        filesData = filesData.filter(f => f.card !== card);
        card.remove();
      };
      overlay.appendChild(delBtn);

      // privacy toggles (friends/private)
      ["friends","private"].forEach(choice => {
        const span = document.createElement("span");
        span.className = choice;
        span.textContent = choice;
        span.onclick = e => {
          e.stopPropagation();
          badge.textContent = choice;
          badge.className = `badge ${choice}`;
          const entry = filesData.find(f => f.card === card);
          if (entry) entry.privacy = choice;
        };
        overlay.appendChild(span);
      });

      card.appendChild(overlay);
      previewGrid.appendChild(card);

      filesData.push({
        file,
        dateInput,
        privacy: "public",
        card
      });
    });
  });

  submitBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");

    const resort = resortInput.value.trim();
    if (!resort) return alert("Enter a resort name.");
    if (!filesData.length) return alert("No files selected.");

    let friendsList = [];
    try {
      const udoc = await getDoc(doc(db, "users", user.uid));
      friendsList = udoc.exists() ? (udoc.data().friends || []) : [];
    } catch {
      console.warn("Could not load friends for metadata.");
    }

    for (let {file, dateInput, privacy} of filesData) {
      const date = dateInput.value;
      if (!date) return alert("Select a date for each photo.");

      // (handle HEIC as before...)
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

      // generate thumbnail
      let thumbBlob;
      try {
        thumbBlob = await generateThumbnail(file);
      } catch (e) {
        console.warn("Thumbnail failed for", file.name, e);
        // fall back to full file as thumbnail
        thumbBlob = file;
      }
      const thumbFile = new File(
        [thumbBlob],
        `thumb_${file.name}`,
        { type: 'image/jpeg' }
      );

      // build storage paths
      const basePath = `${user.uid}/${resort}/${date}/${privacy}`;
      const origPath  = `${basePath}/${file.name}`;
      const thumbPath = `${basePath}/thumb_${file.name}`;

      const origRef  = ref(storage, origPath);
      const thumbRef = ref(storage, thumbPath);

      const metadata = {
        contentType: file.type,
        customMetadata: {
          owner: user.uid,
          privacy,
          friends: privacy === "friends" ? JSON.stringify(friendsList) : ""
        }
      };

      try {
        // upload thumbnail first
        await uploadBytes(thumbRef, thumbFile, {
          contentType: 'image/jpeg',
          customMetadata: metadata.customMetadata
        });
        // then original
        await uploadBytes(origRef, file, metadata);
      } catch (err) {
        console.error("Upload failed for", file.name, err);
        return alert("Failed to upload " + file.name);
      }
    }

    alert("All photos uploaded!");
    previewGrid.innerHTML = "";
    fileInput.value = "";
    resortInput.value = "";
    filesData = [];
  });
});
