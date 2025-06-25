import { auth, storage, db, logOut } from './firebase.js';
import {
  ref,
  listAll,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';

const gallery        = document.getElementById('photo-gallery');
const startDateInput = document.getElementById('startDate');
const endDateInput   = document.getElementById('endDate');
const filterBtn      = document.getElementById('filterBtn');
const modal          = document.getElementById("modal");
const modalImg       = document.getElementById("modal-img");
const modalClose     = document.getElementById("modal-close");
const modalPrev      = document.getElementById("modal-prev");
const modalNext      = document.getElementById("modal-next");

const saveBtn        = document.getElementById('saveCurrentTripBtn');
const loadTripBtn    = document.getElementById('loadSavedTripBtn');
const tripsSelect    = document.getElementById('savedTripsSelect');

let imageList   = [];
let currentIndex= 0;
let currentUser = null;
let friendIds   = [];
let resortParam = null;

// Helper to parse URL params
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

onAuthStateChanged(auth, async user => {
  if (!user) return location.href = 'login.html';
  currentUser = user;
  resortParam = getParam('resort');

  // 1) Load saved trips dropdown
  await populateSavedTrips();

  // 2) If URL has resort & dates, pre-fill and load
  const startP = getParam('start');
  const endP   = getParam('end');
  if (resortParam && startP && endP) {
    startDateInput.value = startP;
    endDateInput.value   = endP;
    await loadPhotos(startP, endP, resortParam);
  }

  // 3) Fetch friend list for “friends” privacy
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  friendIds = (userDoc.data().friends || []);

  // 4) Bind filter button
  filterBtn.addEventListener('click', () => {
    const s = startDateInput.value, e = endDateInput.value;
    if (!s || !e) return alert('Select both dates');
    loadPhotos(s, e, resortParam);
  });

  // 5) Bind save & load trip
  saveBtn.addEventListener('click', async () => {
    if (!resortParam) return alert('Cannot save: no resort selected');
    const s = startDateInput.value, e = endDateInput.value;
    if (!s || !e) return alert('Select both dates to save trip');
    const trip = { resort: resortParam, start: s, end: e };
    await updateDoc(doc(db,'users', user.uid), {
      savedTrips: arrayUnion(trip)
    });
    alert('Trip saved!');
    await populateSavedTrips();
  });

  loadTripBtn.addEventListener('click', () => {
    const sel = tripsSelect.value;
    if (!sel) return alert('Pick a saved trip');
    const { resort, start, end } = JSON.parse(sel);
    startDateInput.value = start;
    endDateInput.value   = end;
    loadPhotos(start, end, resort);
  });

  // 6) Modal arrows & close
  modalClose.onclick = () => modal.style.display = 'none';
  modalPrev.onclick  = () => {
    currentIndex = (currentIndex - 1 + imageList.length) % imageList.length;
    modalImg.src = imageList[currentIndex].url;
  };
  modalNext.onclick  = () => {
    currentIndex = (currentIndex + 1) % imageList.length;
    modalImg.src = imageList[currentIndex].url;
  };
});

// Populate saved trips dropdown from Firestore
async function populateSavedTrips() {
  tripsSelect.innerHTML = '<option value="">-- Select a saved trip --</option>';
  const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
  const saved = docSnap.data().savedTrips || [];
  saved.forEach(trip => {
    const o = document.createElement('option');
    o.value = JSON.stringify(trip);
    o.textContent = `${trip.resort}: ${trip.start} → ${trip.end}`;
    tripsSelect.appendChild(o);
  });
}

// Main photo loader: filters by resort (if given) + date range
async function loadPhotos(start, end, resortFilter=null) {
  gallery.innerHTML = '';
  imageList = [];

  const users = await getDocs(collection(db, 'users'));
  for (let u of users.docs) {
    const uid = u.id;
    const isOwner  = uid === currentUser.uid;
    const isFriend = friendIds.includes(uid);

    try {
      const userFolder = ref(storage, uid);
      const resorts = (await listAll(userFolder)).prefixes;
      for (let resortFolder of resorts) {
        const resortName = resortFolder.name;
        if (resortFilter && resortName !== resortFilter) continue;

        const dates = (await listAll(resortFolder)).prefixes;
        for (let dateFolder of dates) {
          const date = dateFolder.name;
          if (date < start || date > end) continue;

          const privs = (await listAll(dateFolder)).prefixes;
          for (let privFolder of privs) {
            const privacy = privFolder.name;
            const canView = privacy === 'public'
              || (privacy === 'friends' && (isOwner||isFriend))
              || (privacy === 'private' && isOwner);
            if (!canView) continue;

            const items = (await listAll(privFolder)).items;
            for (let itemRef of items) {
              const url = await getDownloadURL(itemRef);
              imageList.push({ url, privacy });

              // build card
              const card = document.createElement('div');
              card.className = 'photo-card';

              const img = document.createElement('img');
              img.src = url;
              img.className = 'gallery-img';
              const idx = imageList.length - 1;
              img.onclick = () => {
                currentIndex = idx;
                modalImg.src = url;
                modal.style.display = 'flex';
              };

              const badge = document.createElement('span');
              badge.className = `badge ${privacy}`;
              badge.textContent = privacy;

              card.append(img, badge);
              gallery.appendChild(card);
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Skipping user ${uid}:`, err);
    }
  }
}

