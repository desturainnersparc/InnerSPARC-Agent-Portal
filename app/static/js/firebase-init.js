import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGmgU5L-lXq--fUMZuUrf7bd_5P00GYyQ",
  authDomain: "inner-sparc-portal.firebaseapp.com",
  projectId: "inner-sparc-portal",
  storageBucket: "inner-sparc-portal.firebasestorage.app",
  messagingSenderId: "913007976233",
  appId: "1:913007976233:web:02b626e4f5b6a747226138",
  measurementId: "G-E773MJ7WN7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Analytics is not available in every browser/runtime, so guard initialization.
isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

// Read CSRF token from cookie (works on every page).
function getCsrf() {
  const m = document.cookie.match(/(?:^|; *)csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}


// After Firebase auth succeeds, create a Django session via the server-side endpoint.
async function bridgeToDjango(firebaseUser) {
  const idToken = await firebaseUser.getIdToken();
  const response = await fetch("/portal-auth/firebase-login/", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrf(),
    },
    body: JSON.stringify({ id_token: idToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Django session creation failed.");
  }
  return data.redirect_url || "/template-beta/";
}

async function completeDjangoLogin(firebaseUser) {
  const redirectUrl = await bridgeToDjango(firebaseUser);
  if (window.location.pathname !== redirectUrl) {
    window.location.href = redirectUrl;
  }
}

let isBridgingSession = false;

async function ensureDjangoSession(firebaseUser) {
  if (!firebaseUser || isBridgingSession) {
    return;
  }

  isBridgingSession = true;

  try {
    await completeDjangoLogin(firebaseUser);
  } catch (error) {
    console.error("Session bridge error:", error);
    alert(error.message || "Could not create your website session. Please try again.");
  } finally {
    isBridgingSession = false;
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Logged in:", user.displayName, user.email);
    ensureDjangoSession(user);
  } else {
    console.log("No user signed in");
  }
});

// Exported so other scripts (e.g. onboardingBeta.js) can call Firebase sign-out
export { auth, signOut };

