// src/components/VerificacionConductorWizard.jsx
// ------------------------------------------------------------
// Wizard paso a paso para verificación de CONDUCTOR (cliente+Storage+Firestore)
// - Compresión OBLIGATORIA a JPEG <= 2MB en el cliente para DNI/Licencia
// - Selfie se maneja en su propio componente (también forzada a <= 2MB)

import React, { useEffect, useMemo, useState, useRef } from 'react';
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
import ProgressBar from './ui/ProgressBar/Basic/Basic';
import CozySpinner from './cozyglow/components/Spinners/CozySpinner/CozySpinner';
import SelfieUploaderMobile from "./verification/SelfieUploaderMobile";
// (no tocamos cozy ni estilos)
// Si tenías un helper previo, ya no es necesario importarlo.

// ---------- Helper: fuerza JPEG <= 2MB (sin dependencias externas)
async function forceCompressTo2MB(file, {
  hardLimitBytes = 2 * 1024 * 1024, // 2MB
  startQuality = 0.82,
  minQuality = 0.35,
  scales = [1, 0.85, 0.7, 0.6, 0.5, 0.4],
} = {}) {
  const loadImageAny = (blob) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });

  let img;
  try {
    img = await loadImageAny(file);
  } catch (e) {
    if (file.size <= hardLimitBytes) return file;
    throw new Error('No se pudo leer la imagen en el navegador.');
  }

  const attemptEncode = (canvas, q) =>
    new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));

  const tryOne = async (scale, q) => {
    const cw = Math.max(1, Math.round(img.naturalWidth * scale));
    const ch = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(img, 0, 0, cw, ch);
    const blob = await attemptEncode(canvas, q);
    if (!blob) throw new Error('toBlob falló');
    return new File([blob], (file.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
  };

  let best = null;
  let q = startQuality;

  // Barrido de calidad a escala 1
  while (q >= minQuality) {
    const out = await tryOne(1, q);
    if (!best || out.size < best.size) best = out;
    if (out.size <= hardLimitBytes) return out;
    q -= 0.1;
  }

  // Downscale + nueva barrida de calidades
  for (const s of scales.slice(1)) {
    q = startQuality;
    while (q >= minQuality) {
      const out = await tryOne(s, q);
      if (!best || out.size < best.size) best = out;
      if (out.size <= hardLimitBytes) return out;
      q -= 0.1;
    }
  }

  throw new Error(`No se pudo comprimir debajo de 2MB (mejor: ${(best?.size/1048576).toFixed(2)}MB). Probá un encuadre un poco más lejos y con buena luz.`);
}

export default function VerificacionConductorWizard({ onExit }) {
  const COLL = 'verificaciones';
  const STORAGE_ROOT = 'verificaciones';

  const user = auth.currentUser;
  const uid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState('incomplete'); // incomplete|pending|verified|rejected
  const [error, setError] = useState('');

  const [datos, setDatos] = useState({ nombreCompleto: '', dniNumero: '' });
  const [urls, setUrls] = useState({
    dniFrente: '',
    dniDorso: '',
    licFrente: '',
    licDorso: '',
    selfie: '',
  });
  const [uploading, setUploading] = useState({}); // progreso por clave 0..100

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
          if (typeof d.step === 'number') setStep(d.step);
        } else {
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

  // -------- Subida de archivos (DNI/Licencia) con compresión obligatoria <= 2MB
  const handleFile = async (key, file) => {
    if (!file || !uid) return;

    // Aceptamos formatos comunes; igual convertimos a JPEG
    const allowed = ['image/jpeg','image/png','image/webp','image/heic','image/heif'];
    if (!allowed.includes(file.type)) {
      alert('Formato no soportado. Subí JPG/PNG/WebP/HEIC.');
      return;
    }

    setUploading((u) => ({ ...u, [key]: 0 }));

    let processed;
    try {
      processed = await forceCompressTo2MB(file, {
        hardLimitBytes: 2 * 1024 * 1024,
        startQuality: 0.82,
        minQuality: 0.35,
        scales: [1, 0.85, 0.7, 0.6, 0.5, 0.4],
      });
    } catch (e) {
      console.error(e);
      alert(e.message || 'No se pudo comprimir la imagen.');
      setUploading((u) => ({ ...u, [key]: undefined }));
      return;
    }

    const safeName = (file.name || 'foto').replace(/[^\w.\-]+/g, '_').replace(/\.[^.]+$/, '');
    const path = `${STORAGE_ROOT}/${uid}/${key}/${Date.now()}-${safeName}.jpg`;
    const ref = storageRef(storage, path);
    const task = uploadBytesResumable(ref, processed, { contentType: 'image/jpeg' });

    return new Promise((resolve, reject) => {
      task.on('state_changed',
        (snap) => {
          const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploading((u) => ({ ...u, [key]: p }));
        },
        (err) => {
          console.error(err);
          setUploading((u) => ({ ...u, [key]: undefined }));
          alert('Falló la subida. Revisá tu conexión.');
          reject(err);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setUrls((prev) => ({ ...prev, [key]: url }));
          setUploading((u) => ({ ...u, [key]: 100 }));
          try {
            await updateDoc(doc(db, COLL, uid), {
              [`${key}URL`]: url,
              updatedAt: serverTimestamp(),
            });
          } catch {
            await setDoc(doc(db, COLL, uid), {
              [`${key}URL`]: url,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
          resolve(url);
        }
      );
    });
  };

  const pasoCompletado = (idx) => {
    if (idx === 0) return !!(datos.nombreCompleto && datos.dniNumero);
    if (idx === 1) return !!(urls.dniFrente && urls.dniDorso);
    if (idx === 2) return !!(urls.licFrente && urls.licDorso);
    if (idx === 3) return !!urls.selfie; // opcional, pero si está, se marca
    return false;
  };

  if (loading) return <CozySpinner text="Cargando verificación..." />;
  if (!uid) return (
    <EmptyCard title="Iniciá sesión">
      <p>Tenés que iniciar sesión para verificar tu identidad.</p>
    </EmptyCard>
  );

  return (
    <div>
      <StatusTag status={status} />
      <Stepper steps={steps} current={step} isDone={pasoCompletado} progress={progress} />

      {error && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FEE2E2', borderRadius:12, color:'#991B1B', padding:12, marginTop:12 }}>
          <span style={{fontSize:12}}>{error}</span>
        </div>
      )}

      <div>
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
          <PasoSelfie
            url={urls.selfie}
            onUploaded={({ url }) => {
              setUrls(prev => ({ ...prev, selfie: url }));
            }}
          />
        )}
        {step === 4 && (
          <PasoResumen datos={datos} urls={urls} status={status} />
        )}
      </div>

      <div style={{display:'flex', justifyContent:'space-between', gap:8, marginTop:16}}>
        <button onClick={goBack} disabled={step===0}>Atrás</button>
        <div style={{display:'flex', gap:8}}>
          <button onClick={completarPasoActual} disabled={saving}>{saving? 'Guardando...' : 'Guardar'}</button>
          {step < totalSteps - 1 ? (
            <button style={{background:'#000', color:'var(--color-surface)'}} onClick={goNext}>Siguiente</button>
          ) : (
            <button style={{background:'#000', color:'var(--color-surface)'}} onClick={onSubmit} disabled={status==='pending'}>
              {status==='pending' ? 'En revisión' : 'Enviar a revisión'}
            </button>
          )}
        </div>
      </div>

      {onExit && (
        <button onClick={onExit} style={{marginTop:12}}>Volver</button>
      )}
      <p style={{color:'var(--color-text-muted)', marginTop:16}}>
        Tus datos y documentos se guardan de forma segura. Solo los verá el equipo de verificación.
      </p>
    </div>
  );
}

// ----------------- Subcomponentes -----------------
function EmptyCard({ title, children }) {
  return (
    <div>
      <h3>{title}</h3>
      <div style={{color:'#374151'}}>{children}</div>
    </div>
  );
}

// Barra simple
function Progress({ value = 0 }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div style={{width:'100%'}}>
      <ProgressBar value={pct} />
    </div>
  );
}

function ChecklistItem({done = false, active = false, label = ""}){
  return(
    <div style={{padding: "0.2rem", display: "flex", justifyContent: "flex-start", alignItems: "center", fontWeight: 600, transition: "0.5s", opacity: active ? 1 : 0.3}}>
      <div style={{position: "relative", width: 24, height: 24, marginRight:8}}>
        {/* Flecha para activo no-completado */}
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={"#000"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          style={{transition: "transform .6s ease, opacity .6s ease", transformOrigin: "center", position: 'absolute',
              transform: (active && !done) ? "rotateX(0deg)" : "rotateX(-180deg)",
              opacity: (active && !done) ? 1 : 0}}
        >
          <path d="M15 17l5-5-5-5" />
        </svg>
        {/* Check para done */}
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={"#094"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          style={{transition: "transform .3s ease, opacity .15s ease", transformOrigin: "center", position: 'absolute',
              transform: done ? "translateY(0px)" : "translateY(100%)",
              opacity: done ? 1 : 0}}
        >
          <path d="M7 13l4 4 9-9" />
        </svg>
      </div>
      <div style={{padding: "0.2rem 0"}}> {label} </div>
    </div>
  );
}

function Stepper({ steps, current, isDone, progress = 0 }) {
  return (
    <div style={{marginTop: "1rem"}}>
      <div style={{marginBottom:12}}>
        <Progress value={progress} />
      </div>
      {steps.map((s, i) => {
        const done = isDone(i);
        const active = i === current;
        return (<ChecklistItem key={s.key} active={active} done={done} label={s.label}/>);
      })}
    </div>
  );
}

function PasoDatos({ datos, setDatos }) {
  return (
    <div style={{marginTop: "1rem"}}>
      <div style={{marginBottom:12}}>
        <label>Nombre completo</label>
        <input
          value={datos.nombreCompleto}
          onChange={(e)=>setDatos(v=>({...v, nombreCompleto:e.target.value}))}
          placeholder="Tal como figura en tu DNI"
          style={{display:'block', width:'100%'}}
        />
      </div>
      <div>
        <label>Número de DNI</label>
        <input
          value={datos.dniNumero}
          onChange={(e)=>setDatos(v=>({...v, dniNumero:e.target.value.replace(/\D/g,'')}))}
          inputMode="numeric"
          placeholder="Ej. 30123456"
          style={{display:'block', width:'100%'}}
        />
        <p style={{color:'var(--color-text-muted)', marginTop:4}}>Usamos estos datos solo para verificar tu identidad.</p>
      </div>
    </div>
  );
}

function PasoDocumentos({ title, frenteKey, dorsoKey, urls, uploading, onFile }) {
  return (
    <div>
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

function PasoSelfie({ url, onUploaded }) {
  return (
    <div>
      <SelfieUploaderMobile onUploaded={onUploaded} />
      {url && (
        <div style={{ marginTop: 12 }}>
          <div style={{color:'var(--color-text-muted)', marginBottom:8}}>Selfie existente</div>
          <div style={{ height: 160, background:'var(--color-bg)', border:'1px solid #E5E7EB', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            <a href={url} target="_blank" rel="noreferrer" style={{display:'block', width:'100%', height:'100%'}}>
              <img src={url} alt="Selfie" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', display:'block' }} />
            </a>
          </div>
        </div>
      )}
      <div style={{marginTop:12}}>
        <h4>Consejos</h4>
        <ul style={{color:'#374151', marginTop:8}}>
          <li>Buena luz, sin reflejos.</li>
          <li>Foto nítida y completa, que se lean los datos.</li>
          <li>Formatos: JPG, PNG, WebP, HEIC. Máx 2 MB (se comprime automáticamente).</li>
        </ul>
      </div>
    </div>
  );
}

function PasoResumen({ datos, urls, status }) {
  return (
    <div>
      <div style={{display:'grid', gap:8, marginBottom:12}}>
        <KeyVal k="Nombre" v={datos.nombreCompleto || '—'} />
        <KeyVal k="DNI" v={datos.dniNumero || '—'} />
      </div>
      <div style={{display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', marginBottom:12}}>
        <Thumb label="DNI Frente" url={urls.dniFrente} />
        <Thumb label="DNI Dorso" url={urls.dniDorso} />
        <Thumb label="Licencia Frente" url={urls.licFrente} />
        <Thumb label="Licencia Dorso" url={urls.licDorso} />
        <Thumb label="Selfie" url={urls.selfie} />
      </div>
      <div style={{ background:'var(--color-bg)', border:'1px solid #E5E7EB', borderRadius:12, color:'#4B5563', fontSize:14, padding:12 }}>
        Estado actual: <StatusTag status={status} /> — Al enviar, quedará <strong>En revisión</strong> por un admin.
      </div>
    </div>
  );
}

function KeyVal({ k, v }) {
  return (
    <div>
      <div style={{textTransform:'uppercase', color:'var(--color-text-muted)'}}>{k}</div>
      <div>{v}</div>
    </div>
  );
}

function Thumb({ label, url }) {
  const boxStyle = { height: 96, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', borderRadius: 12, border:'1px solid #E5E7EB' };
  const imgStyle = { maxWidth:'100%', maxHeight:'100%', objectFit:'contain', display:'block' };

  return (
    <div>
      <div style={{color:'var(--color-text-muted)', marginBottom:8}}>{label}</div>
      <div style={boxStyle}>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" style={{display:'block', width:'100%', height:'100%'}}>
            <img src={url} alt={label} style={imgStyle} />
          </a>
        ) : (
          <div style={{color:'#9CA3AF'}}>Sin archivo</div>
        )}
      </div>
    </div>
  );
}

function StatusTag({ status }) {
  const map = {
    incomplete: { text: 'Incompleto', bg:'rgba(229,231,235,0.6)', fg:'#111827', border:'#D1D5DB' },
    pending:    { text: 'En revisión', bg:'rgba(254,243,199,0.7)', fg:'#92400E', border:'#FDE68A' },
    verified:   { text: 'Verificado', bg:'rgba(187,247,208,0.7)', fg:'#065F46', border:'#86EFAC' },
    rejected:   { text: 'Rechazado',  bg:'rgba(254,202,202,0.7)', fg:'#7F1D1D', border:'#FCA5A5' },
  };
  const s = map[status] || map.incomplete;
  return (
    <span style={{
      display:'inline-block',
      padding:'6px 10px',
      borderRadius:999,
      fontSize:12,
      background:s.bg,
      color:s.fg,
      border:`1px solid ${s.border}`,
      marginBottom:8
    }}>
      {s.text}
    </span>
  );
}

function DocTile({ label, url, onSelect, progress, hint }) {
  const fileRef = useRef(null);
  const openPicker = () => fileRef.current?.click();

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onSelect(file);
  };
  const handleDragOver = (e) => e.preventDefault();

  const previewBoxStyle = { height: 160, background:'var(--color-bg)', border:'1px solid #E5E7EB', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' };
  const imgStyle = { maxWidth:'100%', maxHeight:'100%', objectFit:'contain', display:'block' };

  return (
    <div style={{marginBottom:12}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6}}>
        <div>
          <div style={{fontWeight:600}}>{label}</div>
          {hint && <div style={{color:'var(--color-text-muted)'}}>{hint}</div>}
        </div>
        {url && <a href={url} target="_blank" rel="noreferrer">Ver</a>}
      </div>

      <div
        style={previewBoxStyle}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" style={{display:'block', width:'100%', height:'100%'}}>
            <img src={url} alt={label} style={imgStyle} />
          </a>
        ) : (
          <span style={{color:'#9CA3AF'}}>Soltá una imagen acá o usá <b>Subir foto</b></span>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        style={{ display:'none' }}
      />

      <div style={{display:'flex', alignItems:'center', gap:8, marginTop:6}}>
        <button type="button" onClick={openPicker}>Subir foto</button>
        {typeof progress === 'number' && (
          <span style={{color:'var(--color-text-muted)'}}>{progress}%</span>
        )}
      </div>
    </div>
  );
}
