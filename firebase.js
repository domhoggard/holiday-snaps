// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDtU-2A9FMYQ_hV5KJ8Ks1tOdc9zGq1XXw",
  authDomain: "holiday-snaps-dh.firebaseapp.com",
  projectId: "holiday-snaps-dh",
  storageBucket: "holiday-snaps-dh.appspot.com",
  messagingSenderId: "830515346679",
  appId: "1:830515346679:web:8c15bdc7c8e80358e3b469"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
