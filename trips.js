import { auth, storage, db, logOut } from './firebase.js';
import { ref, uploadBytes, listAll } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("uploadBtn");
  const resortList = document.getElementById("resort-list");
  const logoutLink = document.getElementById("logout-link");

  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    logOut();
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) return location.href = "login.html";

    if (uploadBtn) {
      uploadBtn.addEventListener("click", async () => {
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
          alert("HEIC files are not supported on desktop. Please upload from a mobile device or convert the image to JPG/PNG.");
          return;
        }

        // Convert HEIC on mobile (if supported)
        if (fileExtension === "heic") {
          try {
            const heic2any = (await import('https://cdn.jsdelivr.net/npm/heic2any@0.0.3/dist/heic2any.min.js')).default;
            const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg' });
            file = new File([convertedBlob], file.name.replace(/\.heic$/, '.jpg'), { type: 'image/jpeg' });
          } catch (conversionError) {
            console.error("HEIC conversion failed:", conversionError);
            alert("HEIC conversion failed. Please try a different file or upload from mobile.");
            return;
          }
        }

        const filePath = `${user.uid}/${resort}/${date}/${privacy}/${file.name}`;
        const storageRef = ref(storage, filePath);

        // Prepare metadata
        let metadata = {
          customMetadata: {
            privacy: privacy,
            owner: user.uid
          }
        };

        if (privacy === "friends") {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const friendsArray = userData.friends || [];
              metadata.customMetadata.friends = JSON.stringify(friendsArray);
            }
          } catch (error) {
            console.error("Error fetching friends for metadata:", error);
          }
        }

        try {
          await uploadBytes(storageRef, file, metadata);
          alert("Photo uploaded successfully!");
          await listResorts(user.uid);
        } catch (error) {
          console.error("Upload error:", error);
          alert("Upload failed.");
        }
      });
    }

    listResorts(user.uid);
  });

  async function listResorts(uid) {
    resortList.innerHTML = "";
    try {
      const userRef = ref(storage, uid);
      const result = await listAll(userRef);
      result.prefixes.forEach((resortFolder) => {
        const resortName = resortFolder.name;
        const li = document.createElement("li");
        const link = document.createElement("a");
        link.href = `gallery.html?resort=${encodeURIComponent(resortName)}`;
        link.textContent = resortName;
        li.appendChild(link);
        resortList.appendChild(li);
      });
    } catch (error) {
      console.error("Listing resorts failed:", error);
    }
  }
});


