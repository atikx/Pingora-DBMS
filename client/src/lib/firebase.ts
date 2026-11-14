import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAqXERR6xwiv43Qn0yUBtNBfXEJZ1bgG6I",
  authDomain: "pingora-ac2dd.firebaseapp.com",
  projectId: "pingora-ac2dd",
  storageBucket: "pingora-ac2dd.firebasestorage.app",
  messagingSenderId: "1073312510452",
  appId: "1:1073312510452:web:cb3555cd30ec978c01c9a1",
  measurementId: "G-M2V9K0VJ7J"
};

// const firebaseConfig = {
//   apiKey: "AIzaSyC5Qx-s9TJy48SsQlCwr-zm69-HJpSb7z8",
//   authDomain: "pingorav2.firebaseapp.com",
//   projectId: "pingorav2",
//   storageBucket: "pingorav2.firebasestorage.app",
//   messagingSenderId: "1020060535020",
//   appId: "1:1020060535020:web:467d01f19f57f09e1bbdc9",
//   measurementId: "G-SSWDB01GH0"
// };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();