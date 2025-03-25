import React, { useEffect, useState } from "react";
import { db, storage } from "./firebaseConfig";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { listAll, ref, getDownloadURL } from "firebase/storage";

export default function AdminPanel({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [results, setResults] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        // Nutzerliste (angenommen in Firestore unter 'users')
        const usersSnap = await getDocs(collection(db, "users"));
        const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);

        // Fortschritt (aus quiz_results)
        const resultSnap = await getDocs(query(collection(db, "quiz_results"), orderBy("timestamp", "desc")));
        const resultList = resultSnap.docs.map(doc => doc.data());
        setResults(resultList);

        // Dateien im Storage
        const userDirs = await Promise.all(
          usersList.map(async (user) => {
            const folderRef = ref(storage, `uploads/${user.id}`);
            try {
              const folder = await listAll(folderRef);
              const urls = await Promise.all(folder.items.map(file => getDownloadURL(file)));
              return { uid: user.id, urls };
            } catch {
              return { uid: user.id, urls: [] };
            }
          })
        );

        setFiles(userDirs);
        setLoading(false);
      } catch (err) {
        console.error("Fehler beim Laden der Admin-Daten:", err);
      }
    };

    loadAdminData();
  }, []);

  if (loading) return <div className="text-center">Lade Admin-Daten...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Admin-Bereich</h2>

      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-2">👥 Nutzer</h3>
        <ul className="list-disc pl-6">
          {users.map((u) => (
            <li key={u.id}>{u.email || u.id} – Rolle: {u.role || "(keine)"}</li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-2">📈 Lernfortschritt</h3>
        <ul className="list-disc pl-6 max-h-64 overflow-auto">
          {results.map((r, idx) => (
            <li key={idx}>
              {r.uid?.slice(0, 6)}... → {r.correct ? "✅ richtig" : "❌ falsch"} – {r.question?.slice(0, 40)}...
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-2">📁 Hochgeladene Dateien</h3>
        {files.map((f) => (
          <div key={f.uid} className="mb-4">
            <p className="font-medium">User: {f.uid}</p>
            <ul className="list-disc pl-6">
              {f.urls.map((url, i) => (
                <li key={i}><a href={url} className="text-blue-600 underline" target="_blank" rel="noreferrer">{url.split("/").pop()}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
