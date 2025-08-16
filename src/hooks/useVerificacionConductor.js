// src/components/VerificacionConductorWizard.jsx
// ------------------------------------------------------------
// Wizard paso a paso para que el CONDUCTOR cargue y verifique:
// 1) Datos básicos (nombre, DNI)
// 2) Documento DNI (frente/dorso)
// 3) Licencia de conducir (frente/dorso)
// 4) Selfie de verificación (opcional pero recomendado)
// 5) Revisión y envío a verificación (status = "pending")
//
// • Guarda progreso automáticamente en Firestore
// • Sube archivos a Firebase Storage con barra de progreso
// • Muestra barra de avance global y estado por paso
// • Permite retomar donde quedó (resume)
// • Diseño simple con clases utilitarias (Tailwind friendly)
//
// Requisitos:
//  - Tener configurado Firebase en src/firebase.js exportando { auth, db, storage }
//  - Firestore colección: "verificaciones" doc por uid
//  - Storage: "verificaciones/{uid}/{docKey}/archivo"
//  - Reglas (orientativas):
//      allow write: if request.auth != null && request.auth.uid == resource.id (ajustar a tu modelo)
//
// Cómo usar:
//  import VerificacionConductorWizard from "./components/VerificacionConductorWizard";
//  <VerificacionConductorWizard onExit={() => navigate('/perfil-conductor')} />
//
// Integración con tu flujo:
//  - En PerfilConductorV2, agregar un botón "Verificar identidad" que lleve a esta vista.
//  - Cuando status === 'verified' mostrar badge "Verificado".

import React, { useEffect, useMemo, useState } from 'react';
import { auth, db, storage } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';

export default function VerificacionConductorWizard({ onExit }) {
  // 🔒 Unificados con reglas: NO cambiar sin alinear reglas
  const COLL = 'verificaciones';
  const STORAGE_ROOT = 'verificaciones';

  const user = auth.currentUser;
  const uid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState('incomplete'); // incomplete|pending|verified|rejected
  const [error, setError] = useState('');

  // Datos y archivos
  const [datos, setDatos] = useState({ nombreCompleto: '', dniNumero: '' });
  const [urls, setUrls] = useState({
    dniFrente: '',
    dniDorso: '',
    licFrente: '',
    licDorso: '',
    selfie: '',
  });
  const [uploading, setUploading] = useState({}); // progreso por clave 0..100

  // Cargar progreso si existe
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!uid) {
          setError('Necesitás iniciar sesión para verificar tu identidad.');
          setLoading(false);
          return;
        }
        const ref = doc(db, COLL, uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data();
          setDatos({
            nombreCompleto: d.nombreCompleto || '',
            dniNumero: d.dniNumero || '',
          });
          setUrls({
            dniFrente: d.dniFrenteURL || '',
            dniDorso: d.dniDorsoURL || '',
            licFrente: d.licenciaFrenteURL || '',
            licDorso: d.licenciaDorsoURL || '',
            selfie: d.selfieURL || '',
          });
          setStatus(d.status || 'incomplete');
          // Si hay paso guardado, retomamos
          if (typeof d.step === 'number') setStep(d.step);
        } else {
          // Doc inicial
          await setDoc(ref, {
            status: 'incomplete',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (e) {
        console.error(e);
        setError('No se pudo cargar tu verificación.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [uid]);

  const steps = useMemo(() => ([
    { key: 'datos', label: 'Tus datos' },
    { key: 'dni', label: 'DNI' },
    { key: 'licencia', label: 'Licencia' },
    { key: 'selfie', label: 'Selfie' },
    { key: 'resumen', label: 'Confirmar' },
  ]), []);

  const totalSteps = steps.length;
  const progress = Math.round((step) / (totalSteps - 1) * 100);

  const completarPasoActual = async () => {
    setSaving(true);
    setError('');
    try {
      const ref = doc(db, COLL, uid);
      await updateDoc(ref, {
        nombreCompleto: datos.nombreCompleto,
        dniNumero: datos.dniNumero,
        dniFrenteURL: urls.dniFrente,
        dniDorsoURL: urls.dniDorso,
        licenciaFrenteURL: urls.licFrente,
        licenciaDorsoURL: urls.licDorso,
        selfieURL: urls.selfie,
        step,
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      setError('No se pudo guardar. Revisá tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    // Validación por paso
    if (step === 0) {
      if (!datos.nombreCompleto || !datos.dniNumero) {
        setError('Completá tu nombre y DNI para continuar.');
        return;
      }
    }
    if (step === 1) {
      if (!urls.dniFrente || !urls.dniDorso) {
        setError('Subí frente y dorso del DNI.');
        return;
      }
    }
    if (step === 2) {
      if (!urls.licFrente || !urls.licDorso) {
        setError('Subí frente y dorso de la licencia.');
        return;
      }
    }

    await completarPasoActual();
    setError('');
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };

  const goBack = async () => {
    await completarPasoActual();
    setStep((s) => Math.max(s - 1, 0));
  };

  const onSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const ref = doc(db, COLL, uid);
      await updateDoc(ref, {
        nombreCompleto: datos.nombreCompleto,
        dniNumero: datos.dniNumero,
        dniFrenteURL: urls.dniFrente,
        dniDorsoURL: urls.dniDorso,
        licenciaFrenteURL: urls.licFrente,
        licenciaDorsoURL: urls.licDorso,
        selfieURL: urls.selfie,
        status: 'pending',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setStatus('pending');
    } catch (e) {
      console.error(e);
      setError('No se pudo enviar a verificación.');
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (key, file) => {
    if (!file || !uid) return;
    // Validaciones rápidas
    const maxMB = 8;
    if (file.size > maxMB * 1024 * 1024) {
      alert(`El archivo supera ${maxMB} MB.`);
      return;
    }
    const allowed = ['image/jpeg','image/png','image/webp','image/heic','image/heif'];
    if (!allowed.includes(file.type)) {
      alert('Formato no soportado. Subí JPG/PNG/WebP/HEIC.');
      return;
    }

    const path = `${STORAGE_ROOT}/${uid}/${key}/${Date.now()}-${file.name}`;
    const ref = storageRef(storage, path);
    const task = uploadBytesResumable(ref, file, { contentType: file.type });

    return new Promise((resolve, reject) => {
      setUploading((u) => ({ ...u, [key]: 0 }));
      task.on('state_changed', (snap) => {
        const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setUploading((u) => ({ ...u, [key]: p }));
      }, (err) => {
        console.error(err);
        setUploading((u) => ({ ...u, [key]: undefined }));
        reject(err);
      }, async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setUrls((prev) => ({ ...prev, [key]: url }));
        setUploading((u) => ({ ...u, [key]: 100 }));
        // Guardado rápido
        try {
          await updateDoc(doc(db, COLL, uid), {
            [`${key}URL`]: url,
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          // Si todavía no existe el doc por algún motivo, lo creamos
          await setDoc(doc(db, COLL, uid), {
            [`${key}URL`]: url,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        resolve(url);
      });
    });
  };

  const pasoCompletado = (idx) => {
    if (idx === 0) return !!(datos.nombreCompleto && datos.dniNumero);
    if (idx === 1) return !!(urls.dniFrente && urls.dniDorso);
    if (idx === 2) return !!(urls.licFrente && urls.licDorso);
    if (idx === 3) return !!urls.selfie; // opcional: podrías permitir skip
    return false;
  };

  if (loading) return <Splash text="Cargando verificación..." />;
  if (!uid) return (
    <EmptyCard title="Iniciá sesión">
      <p>Tenés que iniciar sesión para verificar tu identidad.</p>
    </EmptyCard>
  );

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Verificación de identidad (Conductor)</h1>
          <p className="text-sm text-gray-500">Estado: <StatusBadge status={status} /></p>
        </div>
        {onExit && (
          <button className="px-3 py-2 rounded-xl border hover:bg-gray-50" onClick={onExit}>Salir</button>
        )}
      </header>

      <Progress value={progress} />

      <Stepper steps={steps} current={step} isDone={pasoCompletado} />

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      <div className="mt-4">
        {step === 0 && (
          <PasoDatos datos={datos} setDatos={setDatos} />
        )}
        {step === 1 && (
          <PasoDocumentos
            title="DNI"
            frenteKey="dniFrente"
            dorsoKey="dniDorso"
            urls={urls}
            uploading={uploading}
            onFile={handleFile}
          />
        )}
        {step === 2 && (
          <PasoDocumentos
            title="Licencia de conducir"
            frenteKey="licFrente"
            dorsoKey="licDorso"
            urls={urls}
            uploading={uploading}
            onFile={handleFile}
          />
        )}
        {step === 3 && (
          <PasoSelfie url={urls.selfie} uploading={uploading.selfie} onFile={(f) => handleFile('selfie', f)} />
        )}
        {step === 4 && (
          <PasoResumen datos={datos} urls={urls} status={status} />
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button className="px-3 py-2 rounded-xl border hover:bg-gray-50" onClick={goBack} disabled={step===0}>Atrás</button>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-xl border" onClick={completarPasoActual} disabled={saving}>{saving? 'Guardando...' : 'Guardar'}</button>
          {step < totalSteps - 1 ? (
            <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={goNext}>Siguiente</button>
          ) : (
            <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={onSubmit} disabled={status==='pending'}>
              {status==='pending' ? 'En revisión' : 'Enviar a revisión'}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-4">Tus datos y documentos se guardan de forma segura. Solo los verá el equipo de verificación.</p>
    </div>
  );
}

// ----------------- Subcomponentes -----------------
function Splash({ text }) {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="text-sm text-gray-600">{text || 'Cargando...'}</div>
    </div>
  );
}

function EmptyCard({ title, children }) {
  return (
    <div className="max-w-lg mx-auto p-6 border rounded-2xl">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}

function Progress({ value=0 }) {
  return (
    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-black" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function Stepper({ steps, current, isDone }) {
  return (
    <ol className="mt-3 flex items-center gap-2 text-sm flex-wrap">
      {steps.map((s, i) => {
        const done = isDone(i);
        const active = i === current;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border ${done ? 'bg-green-600 text-white border-green-600' : active ? 'bg-black text-white border-black' : ''}`}>{done ? '✓' : i+1}</span>
            <span className={active ? 'font-medium' : 'text-gray-500'}>{s.label}</span>
            {i < steps.length - 1 && <span className="mx-1 text-gray-300">›</span>}
          </li>
        );
      })}
    </ol>
  );
}

function PasoDatos({ datos, setDatos }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Nombre completo</label>
        <input className="mt-1 w-full border rounded-xl px-3 py-2" value={datos.nombreCompleto}
               onChange={(e)=>setDatos(v=>({...v, nombreCompleto:e.target.value}))} placeholder="Tal como figura en tu DNI" />
      </div>
      <div>
        <label className="block text-sm font-medium">Número de DNI</label>
        <input className="mt-1 w-full border rounded-xl px-3 py-2" value={datos.dniNumero}
               onChange={(e)=>setDatos(v=>({...v, dniNumero:e.target.value.replace(/\D/g,'')}))} inputMode="numeric" placeholder="Ej. 30123456" />
        <p className="text-xs text-gray-500 mt-1">Usamos estos datos solo para verificar tu identidad.</p>
      </div>
    </div>
  );
}

function PasoDocumentos({ title, frenteKey, dorsoKey, urls, uploading, onFile }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <DocTile
        label={`${title} - Frente`}
        url={urls[frenteKey]}
        progress={uploading[frenteKey]}
        onSelect={(file)=>onFile(frenteKey, file)}
      />
      <DocTile
        label={`${title} - Dorso`}
        url={urls[dorsoKey]}
        progress={uploading[dorsoKey]}
        onSelect={(file)=>onFile(dorsoKey, file)}
      />
    </div>
  );
}

function PasoSelfie({ url, uploading, onFile }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <DocTile label="Selfie de verificación" url={url} progress={uploading} onSelect={onFile} hint="Tomá una selfie sosteniendo tu DNI (opcional, acelera la verificación)." />
      <div className="p-4 border rounded-2xl">
        <h4 className="font-medium">Consejos</h4>
        <ul className="list-disc ml-5 text-sm mt-2 text-gray-700">
          <li>Buena luz, sin reflejos.</li>
          <li>Foto nítida y completa, que se lean los datos.</li>
          <li>Formatos admitidos: JPG, PNG, WebP, HEIC. Máx 8MB.</li>
        </ul>
      </div>
    </div>
  );
}

function PasoResumen({ datos, urls, status }) {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <KeyVal k="Nombre" v={datos.nombreCompleto || '—'} />
        <KeyVal k="DNI" v={datos.dniNumero || '—'} />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Thumb label="DNI Frente" url={urls.dniFrente} />
        <Thumb label="DNI Dorso" url={urls.dniDorso} />
        <Thumb label="Licencia Frente" url={urls.licFrente} />
        <Thumb label="Licencia Dorso" url={urls.licDorso} />
        <Thumb label="Selfie" url={urls.selfie} />
      </div>
      <div className="p-3 bg-gray-50 border rounded-2xl text-sm text-gray-600">
        Estado actual: <StatusBadge status={status} /> — Al enviar, quedará <strong>En revisión</strong> por un admin.
      </div>
    </div>
  );
}

function KeyVal({ k, v }) {
  return (
    <div className="border rounded-2xl p-3">
      <div className="text-xs uppercase text-gray-500">{k}</div>
      <div className="text-sm">{v}</div>
    </div>
  );
}

function Thumb({ label, url }) {
  return (
    <div className="border rounded-2xl p-3">
      <div className="text-xs text-gray-500 mb-2">{label}</div>
      {url ? (
        <img src={url} alt={label} className="w-full h-36 object-cover rounded-xl border" />
      ) : (
        <div className="h-36 flex items-center justify-center text-gray-400 border rounded-xl">Sin archivo</div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    incomplete: { text: 'Incompleto', cls: 'bg-gray-200 text-gray-800' },
    pending: { text: 'En revisión', cls: 'bg-yellow-200 text-yellow-900' },
    verified: { text: 'Verificado', cls: 'bg-green-200 text-green-900' },
    rejected: { text: 'Rechazado', cls: 'bg-red-200 text-red-900' },
  };
  const s = map[status] || map.incomplete;
  return <span className={`px-2 py-0.5 rounded-full text-xs ${s.cls}`}>{s.text}</span>;
}

function DocTile({ label, url, onSelect, progress, hint }) {
  return (
    <div className="p-4 border rounded-2xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-medium">{label}</div>
          {hint && <div className="text-xs text-gray-500">{hint}</div>}
        </div>
        {url && <a className="text-xs underline" href={url} target="_blank" rel="noreferrer">Ver</a>}
      </div>

      <div className="aspect-[4/3] bg-gray-50 border rounded-xl flex items-center justify-center overflow-hidden">
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-sm">Sin archivo</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="inline-flex items-center px-3 py-2 border rounded-xl cursor-pointer hover:bg-gray-50">
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e)=> onSelect(e.target.files?.[0])} />
          Subir foto
        </label>
        {typeof progress === 'number' && (
          <span className="text-xs text-gray-500">{progress}%</span>
        )}
      </div>
    </div>
  );
}


// ===============================
// EXTRA: Badge + Hook de Verificación
// Archivos: src/hooks/useVerificacionConductor.js y src/components/VerificationBadge.jsx
// Uso: mostrar un badge clickeable cerca del nombre del conductor. Si no está verificado, abre el wizard.
// ===============================

// src/hooks/useVerificacionConductor.js
// -------------------------------------
// Lee Firestore en tiempo real y devuelve { loading, status, percent, data }
// status: incomplete | pending | verified | rejected
export function useVerificacionConductor(uid) {
  const React = require('react');
  const { useEffect, useState } = React;
  const { db } = require('../firebase');
  const { doc, onSnapshot } = require('firebase/firestore');

  const [state, setState] = useState({ loading: true, status: 'incomplete', percent: 0, data: null });

  useEffect(() => {
    if (!uid) { setState({ loading:false, status:'incomplete', percent:0, data:null }); return; }
    const ref = doc(db, 'verificaciones', uid); // unificado con reglas
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      const status = d.status || 'incomplete';
      let done = 0; const total = 4; // datos, DNI, licencia, selfie(opcional)
      if (d.nombreCompleto && d.dniNumero) done++;
      if (d.dniFrenteURL && d.dniDorsoURL) done++;
      if (d.licenciaFrenteURL && d.licenciaDorsoURL) done++;
      if (d.selfieURL) done++;
      const percent = Math.min(100, Math.round((done/total)*100));
      setState({ loading:false, status, percent, data: d });
    }, () => setState({ loading:false, status:'incomplete', percent:0, data:null }));
    return () => unsub();
  }, [uid]);

  return state;
}
