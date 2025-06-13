import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import { collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";

let currentUser;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadPhotos();
  } else {
    window.location.href = "login.html";
  }
});

document.getElementById("upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = document.getElementById("photo").files[0];
  const resort = document.getElementById("resort").value;
  const date = document.getElementById("date").value;
  const privacy = document.getElementById("privacy").value;

  const storageRef = ref(storage, `${currentUser.uid}/${resort}/${date}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await addDoc(collection(db, "photos"), {
    uid: currentUser.uid,
    resort,
    date,
    privacy,
    url
  });

  alert("Photo uploaded!");
  loadPhotos();
});

async function loadPhotos() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";
  const q = query(collection(db, "photos"), where("uid", "==", currentUser.uid));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const img = document.createElement("img");
    img.src = data.url;
    img.alt = `${data.resort} - ${data.date}`;
    img.className = "photo";
    gallery.appendChild(img);
  });
}