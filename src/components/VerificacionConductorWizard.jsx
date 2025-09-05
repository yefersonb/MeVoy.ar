// src/components/VerificacionConductorWizard.jsx
// ------------------------------------------------------------
// Wizard paso a paso para que el CONDUCTOR cargue y verifique:
// 1) Datos básicos (nombre, DNI)
// 2) Documento DNI (frente/dorso)
// 3) Licencia de conducir (frente/dorso)
// 4) Selfie de verificación (opcional pero recomendado)
// 5) Revisión y envío a verificación (status = "pending")
//
// â€¢ Guarda progreso automáticamente en Firestore
// â€¢ Sube archivos a Firebase Storage con barra de progreso
// â€¢ Muestra barra de avance global y estado por paso
// â€¢ Permite retomar donde quedó (resume)
// â€¢ Diseño simple (funciona con o sin Tailwind)
//
// Requisitos:
//  - Tener configurado Firebase en src/firebase.js exportando { auth, db, storage }
//  - Firestore colección: "verificaciones" doc por uid
//  - Storage: "verificaciones/{uid}/{docKey}/archivo"

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


export default function VerificacionConductorWizard({ onExit }) {
  // Unificados con reglas
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

  const handleFile = async (key, file) => {
    if (!file || !uid) return;
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
        try {
          await updateDoc(doc(db, COLL, uid), {
            [`${key}URL`]: url,
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
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
    if (idx === 3) return !!urls.selfie; // opcional
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
        <div style={{ background:'#FEF2F2', border:'1px solid #FEE2E2', borderRadius:12, color:'#991B1B' }}>
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
      // guardamos en estado local para que se vea al instante
      setUrls(prev => ({ ...prev, selfie: url }));
      // ya se guarda en Firestore adentro del componente modular
    }}
  />
)}
        {step === 4 && (
          <PasoResumen datos={datos} urls={urls} status={status} />
        )}
      </div>

      <div >
        <button className='button' onClick={goBack} disabled={step===0}>Atrás</button>
        <div >
          <button  onClick={completarPasoActual} disabled={saving}>{saving? 'Guardando...' : 'Guardar'}</button>
          {step < totalSteps - 1 ? (
            <button  style={{background:'#000', color:'var(--color-surface)'}} onClick={goNext}>Siguiente</button>
          ) : (
            <button  style={{background:'#000', color:'var(--color-surface)'}} onClick={onSubmit} disabled={status==='pending'}>
              {status==='pending' ? 'En revisión' : 'Enviar a revisión'}
            </button>
          )}
        </div>
      </div>
          
        {onExit && (
          <button onClick={onExit}>Volver</button>
        )}
      <p  style={{color:'var(--color-text-muted)', marginTop:16}}>Tus datos y documentos se guardan de forma segura. Solo los verá el equipo de verificación.</p>

    </div>
  );
}

// ----------------- Subcomponentes -----------------
function Splash({ text }) {
  return (
    <div style={{height:256}} >
      <div  style={{color:'#4b5563'}}>{text || 'Cargando...'}</div>
    </div>
  );
}

function EmptyCard({ title, children }) {
  return (
    <div >
      <h3 >{title}</h3>
      <div  style={{color:'#374151'}}>{children}</div>
    </div>
  );
}

function Progress({
  value = 0,
  height = 10,                 // alto de la barra
  trackColor = '#E5E7EB',      // color del fondo (gris claro)
  barColor = '#9CA3AF',        // color de la barra (gris medio)
  showLabel = true             // mostrar % centrado
}) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const textColor = pct >= 50 ? 'var(--color-surface)' : '#111827'; // blanco si hay bastante relleno
  return (
    <ProgressBar color="var(--color-primary)"/>
  );

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        position: 'relative',
        width: '100%',
        height,
        background: trackColor,
        borderRadius: 9999,
        overflow: 'hidden'
      }}
      >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: `${pct}%`,
          background: barColor,
          transition: 'width 240ms ease',
        }}
      />
      {showLabel && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: textColor,
            // una sombra suave para legibilidad sobre ambos fondos
            textShadow: '0 1px 2px rgba(0,0,0,0.25)',
            userSelect: 'none'
          }}
        >
          {pct}%
        </div>
      )}
    </div>
  );
}

function ChecklistItem({done = false, active = false, label = ""}){
  return(
    <div style={{padding: "0.2rem", display: "flex", justifyContent: "flex-start", alignItems: "center", fontWeight: 600, transition: "0.5s", opacity: `${active ? 1 : 0.3}`}}>
      <div style={{position: "relative", width: 24, height: 24}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={"#000"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          style={{transition: "transform .6s ease, opacity .6s ease", transformOrigin: "center", position: 'absolute',
              transform: `${(active && (!done)) ? "rotateX(0deg)" : "rotateX(-180deg)"}`,
              opacity: `${(active && (!done)) ? "1" : "0"}`
            }}
          >
          <path d="M15 17l5-5-5-5 5 5 -12 0" />
        </svg>

        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={"#094"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          style={{transition: "transform .3s ease, opacity .15s ease", transformOrigin: "center", position: 'absolute',
              transform: `${done ? "translateY(0px)" : "translateY(100%)"}`,
              opacity: `${done ? "1" : "0"}`
            }}
          >
          <path d="M7 9.5l5 5 10-10" />
        </svg>
      </div>
      
      <div style={{padding: "0.2rem 1rem"}}> {label} </div>
    </div>
  );
}

function Stepper({ steps, current, isDone, progress = 0 }) {
  return (
    <div style={{marginTop: "2rem"}}>
      {
        steps.map(
          (s, i) => {
            const done = isDone(i);
            const active = i === current;
            const base = { display:'inline-flex', alignItems:'center', justifyContent:'center', width:24, height:24, borderRadius:'9999px', border:'1px solid #D1D5DB' };
            return (<ChecklistItem key={s.key} active={active} done={done} label={s.label}/>);
          }
        )
      }
    </div>
  );
}

function PasoDatos({ datos, setDatos }) {
  return (
    <div style={{marginTop: "1rem"}}>
      <div>
        <label >Nombre completo</label>
        <input  value={datos.nombreCompleto}
               onChange={(e)=>setDatos(v=>({...v, nombreCompleto:e.target.value}))} placeholder="Tal como figura en tu DNI" />
      </div>
      <div>
        <label >Número de DNI</label>
        <input  value={datos.dniNumero}
               onChange={(e)=>setDatos(v=>({...v, dniNumero:e.target.value.replace(/\D/g,'')}))} inputMode="numeric" placeholder="Ej. 30123456" />
        <p  style={{color:'var(--color-text-muted)', marginTop:4}}>Usamos estos datos solo para verificar tu identidad.</p>
      </div>
    </div>
  );
}

function PasoDocumentos({ title, frenteKey, dorsoKey, urls, uploading, onFile }) {
  return (
    <div >
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
    <div >
      {/* Uploader modular (abre cámara frontal en móvil, comprime, sube, guarda en Firestore) */}
      <SelfieUploaderMobile onUploaded={onUploaded} />

      {/* Mini-preview si ya hay selfie guardada */}
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

      <div >
        <h4 >Consejos</h4>
        <ul  style={{color:'#374151', marginTop:8}}>
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
    <div >
      <div >
        <KeyVal k="Nombre" v={datos.nombreCompleto || 'â€”'} />
        <KeyVal k="DNI" v={datos.dniNumero || 'â€”'} />
      </div>
      <div >
        <Thumb label="DNI Frente" url={urls.dniFrente} />
        <Thumb label="DNI Dorso" url={urls.dniDorso} />
        <Thumb label="Licencia Frente" url={urls.licFrente} />
        <Thumb label="Licencia Dorso" url={urls.licDorso} />
        <Thumb label="Selfie" url={urls.selfie} />
      </div>
      <div  style={{ background:'var(--color-bg)', border:'1px solid #E5E7EB', borderRadius:12, color:'#4B5563', fontSize:14 }}>
        Estado actual: <StatusTag status={status} /> â€” Al enviar, quedará <strong>En revisión</strong> por un admin.
      </div>
    </div>
  );
}

function KeyVal({ k, v }) {
  return (
    <div >
      <div  style={{textTransform:'uppercase', color:'var(--color-text-muted)'}}>{k}</div>
      <div >{v}</div>
    </div>
  );
}

function Thumb({ label, url }) {
  // Alto fijo chico para miniatura del resumen
  const boxStyle = { height: 96, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', borderRadius: 12, border:'1px solid #E5E7EB' };
  const imgStyle = { maxWidth:'100%', maxHeight:'100%', objectFit:'contain', display:'block' };

  return (
    <div >
      <div  style={{color:'var(--color-text-muted)', marginBottom:8}}>{label}</div>
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

/* ToDo: Esta es una idea para las nuevas etiquetas de estado de perfil. Aplicar la lógica de renderizado: */
function StatusTag({ status }) {
  const map = {
    incomplete: { text: 'Incompleto', bg:'#E5E7EB', fg:'var(--color-text)' },
    pending:    { text: 'En revisión', bg:'#FEF3C7', fg:'#92400E' },
    verified:   { text: 'Verificado', bg:'#BBF7D0', fg:'#065F46' },
    rejected:   { text: 'Rechazado',  bg:'#FECACA', fg:'#7F1D1D' },
  };
  const s = map[status] || map.incomplete;
  return (
    <div>
      <div style={{width: "100%", padding: "0.5rem 1rem", fontSize: "1.5rem", fontWeight: "600", display: "flex", justifyContent: "center", borderRadius: "5px", borderBottom: "5px solid var(--color-warning)"}}>
        Seguí de completando tu documentación      
      </div>

      <div style={{width: "100%", padding: "0.5rem 1rem", fontWeight: "600", borderRadius: "5px", borderLeft: "5px solid #0003"}}>
        Estamos validando tus datos...
      </div>

      <div style={{width: "100%", padding: "0.5rem 1rem", fontWeight: "600", borderRadius: "5px", borderLeft: "5px solid rgba(59, 253, 0, 0.59)"}}>
        Verificado
      </div>

      <div style={{width: "100%", padding: "0.5rem 1rem", borderRadius: "5px", borderLeft: "5px solid rgba(253, 0, 0, 0.59)", backgroundColor: "rgba(253, 0, 0, 0.11)"}}>
        <b>Rechazado</b> — No pudimos verificar tu identidad
      </div>
    </div>
    /*
      <span style={{ padding:'2px 8px', borderRadius:999, fontSize:12, background:s.bg, color:s.fg }}>
        {s.text}
      </span>
    
    */
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

  // Drag & drop opcional
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onSelect(file);
  };
  const handleDragOver = (e) => e.preventDefault();

  // Alto fijo chico para que NO se vean gigantes (aplica siempre)
  const previewBoxStyle = { height: 160, background:'var(--color-bg)', border:'1px solid #E5E7EB', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' };
  const imgStyle = { maxWidth:'100%', maxHeight:'100%', objectFit:'contain', display:'block' };

  return (
    <div >
      <div >
        <div>
          <div >{label}</div>
          {hint && <div  style={{color:'var(--color-text-muted)'}}>{hint}</div>}
        </div>
        {url && <a  href={url} target="_blank" rel="noreferrer">Ver</a>}
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
          <span  style={{color:'#9CA3AF'}}>Soltá una imagen acá o usá <b>Subir foto</b></span>
        )}
      </div>

      {/* Input real, lo oculto con style para no depender de Tailwind */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        style={{ display:'none' }}
      />

      <div >
        <button
          type="button"          
          onClick={openPicker}
          className='button'
          >
          Subir foto
        </button>
        {typeof progress === 'number' && (
          <span  style={{color:'var(--color-text-muted)'}}>{progress}%</span>
        )}
      </div>
    </div>
  );
}

