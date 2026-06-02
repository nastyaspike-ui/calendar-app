import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyDc6iZQlgk7zpI11g2-tq6ill53-DuhJGA",
  authDomain: "calendar-bfaa2.firebaseapp.com",
  databaseURL: "https://calendar-bfaa2-default-rtdb.firebaseio.com",
  projectId: "calendar-bfaa2",
  storageBucket: "calendar-bfaa2.firebasestorage.app",
  messagingSenderId: "528839688600",
  appId: "1:528839688600:web:d66501791e8d8c60336bed",
  measurementId: "G-VCDP12RJ26"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
