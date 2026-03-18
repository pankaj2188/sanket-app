import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// YOUR EXACT FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCdje4yXGej8A6LC0o1LT-NmY1k6UFMbe8",
  authDomain: "sanket-a3a10.firebaseapp.com",
  projectId: "sanket-a3a10",
  storageBucket: "sanket-a3a10.firebasestorage.app",
  messagingSenderId: "300463441460",
  appId: "1:300463441460:web:6b2e154ff3b5299492ac61"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Free Google STUN Servers (Helps phones find their own IP addresses)
const servers = {
    iceServers: [
        { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
    ]
};

let peerConnection = new RTCPeerConnection(servers);
let dataChannel = null;

const createBtn = document.getElementById('createRoomBtn');
const joinBtn = document.getElementById('joinRoomBtn');
const statusText = document.getElementById('status');
const roomName = "sanket_demo_room"; 

// ==========================================
// ROLE 1: THE HOST (Creates the Broadcast)
// ==========================================
createBtn.addEventListener('click', async () => {
    statusText.innerText = "Status: Creating Sanket broadcast...";
    dataChannel = peerConnection.createDataChannel('sanket_alerts');
    setupDataChannel(dataChannel);

    const roomRef = doc(db, 'sanket_rooms', roomName);
    const callerCandidates = collection(roomRef, 'callerCandidates');

    peerConnection.addEventListener('icecandidate', event => {
        if (event.candidate) {
            addDoc(callerCandidates, event.candidate.toJSON());
        }
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const roomWithOffer = { offer: { type: offer.type, sdp: offer.sdp } };
    await setDoc(roomRef, roomWithOffer);
    statusText.innerText = "Status: Broadcast created! Waiting for someone to join...";

    onSnapshot(roomRef, snapshot => {
        const data = snapshot.data();
        if (!peerConnection.currentRemoteDescription && data && data.answer) {
            const rtcSessionDescription = new RTCSessionDescription(data.answer);
            peerConnection.setRemoteDescription(rtcSessionDescription);
        }
    });

    onSnapshot(collection(roomRef, 'calleeCandidates'), snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                let data = change.doc.data();
                peerConnection.addIceCandidate(new RTCIceCandidate(data));
            }
        });
    });
});

// ==========================================
// ROLE 2: THE RECEIVER (Joins the Broadcast)
// ==========================================
joinBtn.addEventListener('click', async () => {
    statusText.innerText = "Status: Searching for Sanket broadcast...";
    const roomRef = doc(db, 'sanket_rooms', roomName);
    const roomSnapshot = await getDoc(roomRef);

    if (!roomSnapshot.exists()) {
        statusText.innerText = "Status: No broadcast found to join.";
        return;
    }

    peerConnection.addEventListener('datachannel', event => {
        dataChannel = event.channel;
        setupDataChannel(dataChannel);
    });

    const calleeCandidates = collection(roomRef, 'calleeCandidates');
    peerConnection.addEventListener('icecandidate', event => {
        if (event.candidate) {
            addDoc(calleeCandidates, event.candidate.toJSON());
        }
    });

    const offer = roomSnapshot.data().offer;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    const roomWithAnswer = { answer: { type: answer.type, sdp: answer.sdp } };
    await updateDoc(roomRef, roomWithAnswer);
    statusText.innerText = "Status: Connecting...";

    onSnapshot(collection(roomRef, 'callerCandidates'), snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                let data = change.doc.data();
                peerConnection.addIceCandidate(new RTCIceCandidate(data));
            }
        });
    });
});

// ==========================================
// HELPER: Handle the P2P Connection
// ==========================================
function setupDataChannel(channel) {
    channel.onopen = () => {
        statusText.innerText = "Status: CONNECTED P2P! Firebase no longer needed.";
        statusText.style.color = "green";
        statusText.style.background = "#d4edda";
    };
    channel.onmessage = (event) => {
        alert("SANKET ALERT: " + event.data); 
    };
}
