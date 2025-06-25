import { auth, storage, db, logOut } from './firebase.js';
import {
  ref,
  listAll,
  getDownloadURL,
  deleteObject,
  uploadBytes
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

let imageList    = [];
let currentIndex = 0;
let currentUser  = null;
let friendIds    = [];
let resortParam  = null;

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

onAuthStateChanged(auth, async user => {
  if (!user) return location.href = 'login.html';
  currentUser = user;
  resortParam = getParam('resort');

  await populateSavedTrips();

  const startP = getParam('start');
  const endP   = getParam('end');
  if (resortParam && startP && endP) {
    startDateInput.value = startP;
    endDateInput.value   = endP;
    await loadPhotos(startP, endP, resortParam);
  }

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  friendIds = (userDoc.data().friends || []);

  filterBtn.addEventListener('click', () => {
    const s = startDateInput.value, e = endDateInput.value;
    if (!s || !e) return alert('Select both dates');
    loadPhotos(s, e, resortParam);
  });

  saveBtn.addEventListener('click', async () => {
    if (!resortParam) return alert('No resort to save');
    const s = startDateInput.value, e = endDateInput.value;
    if (!s||!e) return alert('Select dates');
    const trip = { resort: resortParam, start: s, end: e };
    await updateDoc(doc(db,'users', user.uid), {
      savedTrips: arrayUnion(trip)
    });
    alert('Saved!');
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

async function populateSavedTrips() {
  tripsSelect.innerHTML = '<option value="">-- Select a saved trip --</option>';
  const snap = await getDoc(doc(db,'users', currentUser.uid));
  (snap.data().savedTrips || []).forEach(trip => {
    const o = document.createElement('option');
    o.value = JSON.stringify(trip);
    o.textContent = `${trip.resort}: ${trip.start} → ${trip.end}`;
    tripsSelect.appendChild(o);
  });
}

async function loadPhotos(start, end, resortFilter=null) {
  gallery.innerHTML = '';
  imageList = [];

  const users = await getDocs(collection(db,'users'));
  for (let u of users.docs) {
    const uid = u.id;
    const isOwner  = uid === currentUser.uid;
    const isFriend = friendIds.includes(uid);

    try {
      const userFolder = ref(storage, uid);
      const resorts    = (await listAll(userFolder)).prefixes;
      for (let rf of resorts) {
        const resortName = rf.name;
        if (resortFilter && resortName!==resortFilter) continue;
        const dates = (await listAll(rf)).prefixes;
        for (let df of dates) {
          const date = df.name;
          if (date<start||date> end) continue;
          const privs = (await listAll(df)).prefixes;
          for (let pf of privs) {
            const privacy = pf.name;
            const ok = privacy==='public'
              ||(privacy==='friends'&&(isOwner||isFriend))
              ||(privacy==='private'&&isOwner);
            if (!ok) continue;
            const items = (await listAll(pf)).items;
            for (let itemRef of items) {
              const url = await getDownloadURL(itemRef);
              imageList.push({ url, privacy, ref: itemRef,
                resort: resortName, date, name: itemRef.name
              });

              const card = document.createElement('div');
              card.className = 'photo-card';

              const img = document.createElement('img');
              img.src = url; img.className = 'gallery-img';
              const idx = imageList.length -1;
              img.onclick = ()=>{
                currentIndex=idx;
                modalImg.src = url;
                modal.style.display = 'flex';
              };

              const badge = document.createElement('span');
              badge.className=`badge ${privacy}`;
              badge.textContent = privacy;

              // overlay
              const overlay = document.createElement('div');
              overlay.className = 'overlay';

              // delete btn
              const delBtn = document.createElement('button');
              delBtn.title = 'Delete photo';
              delBtn.innerHTML = `<img src="icons/trash.png" alt="Del">`;
              delBtn.onclick = async e=>{
                e.stopPropagation();
                if(!confirm('Delete this photo?')) return;
                await deleteObject(itemRef);
                loadPhotos(start, end, resortFilter);
              };

              // privacy btn
              const prBtn = document.createElement('button');
              prBtn.title = 'Change privacy';
              prBtn.innerHTML = `<img src="icons/settings.png" alt="Privacy">`;
              prBtn.onclick = async e=>{
                e.stopPropagation();
                const choice = prompt(
                  'New privacy (public/friends/private):',
                  imageList[idx].privacy
                );
                if(!['public','friends','private'].includes(choice)) {
                  return alert('Invalid.');
                }
                // download blob
                const blob = await fetch(url).then(r=>r.blob());
                const newPath = `${uid}/${resortName}/${date}/${choice}/${itemRef.name}`;
                const newRef  = ref(storage, newPath);
                await uploadBytes(newRef, blob, {
                  customMetadata: itemRef.metadata?.customMetadata || {}
                });
                await deleteObject(itemRef);
                loadPhotos(start, end, resortFilter);
              };

              overlay.append(delBtn, prBtn);
              card.append(img, badge, overlay);
              gallery.appendChild(card);
            }
          }
        }
      }
    } catch(e){
      console.warn(`Skip ${uid}:`,e);
    }
  }
}

