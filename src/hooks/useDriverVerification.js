// src/hooks/useDriverVerification.js
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// status: incomplete | pending | verified | rejected
export function useDriverVerification(uid) {
  const [state, setState] = useState({ loading: true, status: 'incomplete', percent: 0, data: null });

  useEffect(() => {
    if (!uid) {
      setState({ loading: false, status: 'incomplete', percent: 0, data: null });
      return;
    }
    const ref = doc(db, 'verificaciones', uid);
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      const status = d.status || 'incomplete';
      let done = 0;
      const total = 4; // datos, DNI, licencia, selfie (optional)
      if (d.nombreCompleto && d.dniNumero) done++;
      if (d.dniFrenteURL && d.dniDorsoURL) done++;
      if (d.licenciaFrenteURL && d.licenciaDorsoURL) done++;
      if (d.selfieURL) done++;
      const percent = Math.min(100, Math.round((done / total) * 100));
      setState({ loading: false, status, percent, data: d });
    }, () => setState({ loading: false, status: 'incomplete', percent: 0, data: null }));
    return () => unsub();
  }, [uid]);

  return state;
}
