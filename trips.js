import { auth, storage, logOut } from './firebase.js';
import { ref, uploadBytes, listAll, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

const resortList = document.getElementById("resort-list");
const uploadBtn = document.getElementById("uploadBtn");

onAuthStateChanged(auth, user => {
  if (!user) return location.href = "login.html";

  if (uploadBtn) {
    uploadBtn.addEventListener("click", async () => {
      const file = document.getElementById("photo").files[0];
      const resort = document.getElementById("resort").value.trim();
      const date = document.getElementById("date").value;
      const privacy = document.getElementById("privacy").value;
      if (!file || !resort || !date) return alert("Please fill all fields");

      const path = `${user.uid}/${resort}/${date}/${privacy}/${file.name}`;
      await uploadBytes(ref(storage, path), file);
      alert("Photo uploaded!");
      listResorts(user.uid);
    });
  }

  listResorts(user.uid);
});

async function listResorts(uid) {
  resortList.innerHTML = "";
  const result = await listAll(ref(storage, uid));
  result.prefixes.forEach(folderRef => {
    const resort = folderRef.name;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `gallery.html?resort=${encodeURIComponent(resort)}`;
    a.textContent = resort;
    li.appendChild(a);
    resortList.appendChild(li);
  });
}
