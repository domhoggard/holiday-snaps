import { auth, storage, logOut } from './firebase.js';
import { ref, uploadBytes, listAll } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';
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
        const file = document.getElementById("photo").files[0];
        const resort = document.getElementById("resort").value.trim();
        const date = document.getElementById("date").value;
        const privacy = document.getElementById("privacy").value;

        if (!file || !resort || !date) {
          return alert("Please fill in all fields.");
        }

        const filePath = `${user.uid}/${resort}/${date}/${privacy}/${file.name}`;
        const storageRef = ref(storage, filePath);
        try {
          await uploadBytes(storageRef, file);
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
