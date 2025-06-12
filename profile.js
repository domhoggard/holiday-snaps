import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      document.getElementById('profile-name').textContent = data.name;
      document.getElementById('profile-dob').textContent = data.dob;
    }
  } else {
    window.location.href = 'login.html';
  }
});

document.getElementById('logout').addEventListener('click', (e) => {
  e.preventDefault();
  signOut(auth);
});