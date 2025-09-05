// src/components/VehiculosConductor.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc as firestoreDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import InputField from "./ui/InputField"


const colors = {
  primary: 'var(--color-primary-700)',
  secondary: '#f8fafc',
  accent: 'var(--color-surface)',
  border: '#e2e8f0',
  text: '#1e293b',
  label: '#64748b',
  error: '#c0392b',
};
const radius = 8;
const shadow = 'var(--color-shadow-sm)';

const shared = {
  input: {
    padding: 10,
    borderRadius: radius / 2,
    border: `1px solid ${colors.border}`,
    fontSize: 15,
    color: colors.text,
    background: colors.accent,
    width: '100%',
    boxSizing: 'border-box',
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontWeight: 500,
    color: colors.label,
    fontSize: 13,
  },
  card: {
    background: colors.accent,
    padding: 18,
    borderRadius: radius,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 18,
    marginBottom: 18,
    boxShadow: shadow,
    border: `1px solid ${colors.border}`,
    position: 'relative',
  },
  image: {
    width: 160,
    borderRadius: 8,
    objectFit: 'cover',
    boxShadow: shadow,
  },
};

const ActionButton = ({ children, variant = 'neutral', disabled = false, onClick, style = {} }) => {
  const base = {
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    border: '1px solid transparent',
    transition: 'background .2s, border .2s',
    opacity: disabled ? 0.6 : 1,
  };
  const variants = {
    primary: {
      background: colors.primary,
      color: 'var(--color-surface)',
      border: `1px solid ${colors.primary}`,
    },
    neutral: {
      background: '#f1f5f9',
      color: 'var(--color-primary-700)',
      border: '1px solid var(--color-primary-700)',
    },
    destructive: {
      background: '#ffe3e3',
      color: colors.error,
      border: `1px solid ${colors.error}`,
    },
    success: {
      background: '#22c55e',
      color: 'var(--color-surface)',
      border: '1px solid #22c55e',
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...base,
        ...(variants[variant] || variants.neutral),
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const FilePicker = ({ label, accept, file, onSelect, placeholder = 'Seleccionar' }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#555', minWidth: 120 }}>{label}</div>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <ActionButton variant="neutral" style={{ padding: '6px 12px' }}>
          {file ? file.name : placeholder}
        </ActionButton>
        <input
          type="file"
          accept={accept}
          onChange={(e) => onSelect(e.target.files[0] || null)}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  </div>
);

const SubTab = ({ active, label, onClick, count }) => (
  <button
    onClick={onClick}
    type="button"
    style={{
      padding: '8px 16px',
      border: 'none',
      background: active ? colors.primary : '#f1f5f9',
      color: active ? 'var(--color-surface)' : '#334155',
      borderRadius: 6,
      cursor: 'pointer',
      fontWeight: 600,
      marginRight: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}
  >
    {label} {typeof count === 'number' && <span style={{ fontSize: 12, opacity: 0.85 }}>({count})</span>}
  </button>
);

const uploadFile = async (usuarioId, file, folder, vehId, setStatus, key) => {
  if (!file) return null;
  setStatus((s) => ({ ...s, [key]: 'uploading' }));
  const path = `${usuarioId}/${folder}/${vehId}/${file.name}`;
  try {
    const ref = storageRef(storage, path);
    await uploadBytes(ref, file);
    const url = await getDownloadURL(ref);
    setStatus((s) => ({ ...s, [key]: 'ok' }));
    return url;
  } catch (e) {
    console.error(`Error subiendo ${key}:`, e);
    setStatus((s) => ({ ...s, [key]: 'error' }));
    return null;
  }
};

const VehiculosConductor = () => {
  const { usuario } = useUser();
  const [vehiculos, setVehiculos] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('agregar');

  const [nuevo, setNuevo] = useState({
    marca: '',
    modelo: '',
    anio: '',
    color: '',
    patente: '',
    asientos: 4,
  });
  const [filesNuevo, setFilesNuevo] = useState({
    imagenFile: null,
    cedulaFile: null,
    seguroFile: null,
    vtvFile: null,
  });
  const [errorsNuevo, setErrorsNuevo] = useState({});
  const [uploadStatusNuevo, setUploadStatusNuevo] = useState({});
  const [savingNuevo, setSavingNuevo] = useState(false);

  const [editStates, setEditStates] = useState({});
  const [loadingVehiculos, setLoadingVehiculos] = useState(false);

  const loadVehiculos = useCallback(async () => {
    if (!usuario) return;
    setLoadingVehiculos(true);
    try {
      const snap = await getDocs(collection(db, 'usuarios', usuario.uid, 'vehiculos'));
      setVehiculos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error cargando vehículos:', e);
    } finally {
      setLoadingVehiculos(false);
    }
  }, [usuario]);

  useEffect(() => {
    loadVehiculos();
  }, [loadVehiculos]);

  const validate = (form) => {
    const errs = {};
    ['marca', 'modelo', 'anio', 'color', 'patente'].forEach((f) => {
      if (!form[f]) errs[f] = 'Requerido';
    });
    return errs;
  };

  const agregarVehiculo = async () => {
    if (!usuario) return;
    const errs = validate(nuevo);
    if (Object.keys(errs).length) {
      setErrorsNuevo(errs);
      return;
    }
    setSavingNuevo(true);
    try {
      const vehRef = await addDoc(collection(db, 'usuarios', usuario.uid, 'vehiculos'), {
        ...nuevo,
        fechaAlta: new Date(),
      });
      const id = vehRef.id;
      const updates = {};
      const [urlImg, urlCed, urlSeg, urlVtv] = await Promise.all([
        uploadFile(usuario.uid, filesNuevo.imagenFile, 'imagen', id, setUploadStatusNuevo, 'imagenFile'),
        uploadFile(usuario.uid, filesNuevo.cedulaFile, 'cedula', id, setUploadStatusNuevo, 'cedulaFile'),
        uploadFile(usuario.uid, filesNuevo.seguroFile, 'seguro', id, setUploadStatusNuevo, 'seguroFile'),
        uploadFile(usuario.uid, filesNuevo.vtvFile, 'vtv', id, setUploadStatusNuevo, 'vtvFile'),
      ]);
      if (urlImg) updates.imagenURL = urlImg;
      if (urlCed) updates.cedulaURL = urlCed;
      if (urlSeg) updates.seguroURL = urlSeg;
      if (urlVtv) updates.vtvURL = urlVtv;
      if (Object.keys(updates).length) {
        await updateDoc(firestoreDoc(db, 'usuarios', usuario.uid, 'vehiculos', id), updates);
      }
      setNuevo({ marca: '', modelo: '', anio: '', color: '', patente: '', asientos: 4 });
      setFilesNuevo({ imagenFile: null, cedulaFile: null, seguroFile: null, vtvFile: null });
      setUploadStatusNuevo({});
      setErrorsNuevo({});
      await loadVehiculos();
      setActiveSubTab('gestionar');
    } catch (e) {
      console.error('Error añadiendo vehículo:', e);
      alert('No se pudo agregar el vehículo.');
    } finally {
      setSavingNuevo(false);
    }
  };

  const startEdit = (veh) => {
    setEditStates((s) => ({
      ...s,
      [veh.id]: {
        edit: true,
        form: {
          marca: veh.marca || '',
          modelo: veh.modelo || '',
          anio: veh.anio || '',
          color: veh.color || '',
          patente: veh.patente || '',
          asientos: veh.asientos || 4,
        },
        files: {},
        uploadStatus: {},
        saving: false,
        errors: {},
      },
    }));
  };

  const cancelEdit = (id) => {
    setEditStates((s) => ({
      ...s,
      [id]: { ...(s[id] || {}), edit: false, errors: {}, uploadStatus: {} },
    }));
  };

  const handleEditChange = (id, field) => (e) => {
    setEditStates((s) => ({
      ...s,
      [id]: {
        ...(s[id] || {}),
        form: { ...(s[id]?.form || {}), [field]: e.target.value },
      },
    }));
  };

  const handleEditFileChange = (id, key, file) => {
    setEditStates((s) => ({
      ...s,
      [id]: {
        ...(s[id] || {}),
        files: { ...(s[id]?.files || {}), [key]: file },
      },
    }));
  };

  const saveEdit = async (veh) => {
    if (!usuario) return;
    const state = editStates[veh.id];
    if (!state) return;
    const errs = validate(state.form);
    if (Object.keys(errs).length) {
      setEditStates((s) => ({
        ...s,
        [veh.id]: { ...(s[veh.id] || {}), errors: errs },
      }));
      return;
    }
    setEditStates((s) => ({
      ...s,
      [veh.id]: { ...(s[veh.id] || {}), saving: true },
    }));
    try {
      const updates = { ...state.form };
      if (state.files?.imagenFile) {
        const url = await uploadFile(
          usuario.uid,
          state.files.imagenFile,
          'imagen',
          veh.id,
          (u) =>
            setEditStates((s) => ({
              ...s,
              [veh.id]: {
                ...(s[veh.id] || {}),
                uploadStatus: { ...(s[veh.id]?.uploadStatus || {}), imagenFile: u.imagenFile || 'uploading' },
              },
            })),
          'imagenFile'
        );
        if (url) updates.imagenURL = url;
      }
      if (state.files?.cedulaFile) {
        const url = await uploadFile(
          usuario.uid,
          state.files.cedulaFile,
          'cedula',
          veh.id,
          (u) =>
            setEditStates((s) => ({
              ...s,
              [veh.id]: {
                ...(s[veh.id] || {}),
                uploadStatus: { ...(s[veh.id]?.uploadStatus || {}), cedulaFile: u.cedulaFile || 'uploading' },
              },
            })),
          'cedulaFile'
        );
        if (url) updates.cedulaURL = url;
      }
      if (state.files?.seguroFile) {
        const url = await uploadFile(
          usuario.uid,
          state.files.seguroFile,
          'seguro',
          veh.id,
          (u) =>
            setEditStates((s) => ({
              ...s,
              [veh.id]: {
                ...(s[veh.id] || {}),
                uploadStatus: { ...(s[veh.id]?.uploadStatus || {}), seguroFile: u.seguroFile || 'uploading' },
              },
            })),
          'seguroFile'
        );
        if (url) updates.seguroURL = url;
      }
      if (state.files?.vtvFile) {
        const url = await uploadFile(
          usuario.uid,
          state.files.vtvFile,
          'vtv',
          veh.id,
          (u) =>
            setEditStates((s) => ({
              ...s,
              [veh.id]: {
                ...(s[veh.id] || {}),
                uploadStatus: { ...(s[veh.id]?.uploadStatus || {}), vtvFile: u.vtvFile || 'uploading' },
              },
            })),
          'vtvFile'
        );
        if (url) updates.vtvURL = url;
      }

      await updateDoc(firestoreDoc(db, 'usuarios', usuario.uid, 'vehiculos', veh.id), updates);
      await loadVehiculos();
      cancelEdit(veh.id);
    } catch (e) {
      console.error('Error guardando edición:', e);
      alert('No se pudieron guardar los cambios.');
    } finally {
      setEditStates((s) => ({
        ...s,
        [veh.id]: { ...(s[veh.id] || {}), saving: false },
      }));
    }
  };

  const eliminarVehiculo = async (vehId) => {
    if (!usuario) return;
    const ok = window.confirm('Querés eliminar ese vehículo? Esta acción no se puede deshacer.');
    if (!ok) return;
    try {
      await deleteDoc(firestoreDoc(db, 'usuarios', usuario.uid, 'vehiculos', vehId));
      await loadVehiculos();
    } catch (e) {
      console.error('Error eliminando vehículo:', e);
      alert('No se pudo eliminar el vehículo.');
    }
  };

  return (
    <div style={{ marginTop: 28, fontFamily: 'inherit' }}>
      <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <SubTab active={activeSubTab === 'agregar'} label="Agregar vehículo" onClick={() => setActiveSubTab('agregar')} />
        <SubTab
          active={activeSubTab === 'gestionar'}
          label="Modificar / Eliminar vehículo"
          count={vehiculos.length}
          onClick={() => setActiveSubTab('gestionar')}
        />
      </div>

      {activeSubTab === 'agregar' && (
        <div
          style={{
            maxWidth: 700,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 8,
            border: "1px solid #0002",
            padding: "1rem",
            gap: 24
          }}
        >
          {/* encabezado de agregar */}
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.primary }}>Agregar un vehículo</div>

          {/* campos en grid */}
          <div style={{ display: 'flex', flexDirection: "column", gap: 16 }}>
            {/*
              ToDo: Reemplazar esto por in component "InputField - Number" custom con mejores Spinners (los botones de subir/bajar)
                    Tal vez podría tener un -/+ de cada lado y un número grande en el medio

                    Asientos:   (( - ) 4 ( + ))      
                    ------------------------------
            */}
              <div className="input-number">
                <label htmlFor="nuevo-asientos"> Asientos </label>
                <input
                  id="nuevo-asientos"
                  type="number"
                  min={1}
                  placeholder="Asientos"
                  value={nuevo.asientos}
                  onChange={(e) => setNuevo((n) => ({ ...n, asientos: +e.target.value }))}
                />
              </div>
            {/* Fin ToDo: Reemplazar est... -/+ ... */}

            { // Ésto genera la lista de inputs... la verdad... podría ser más crudo en pos de readabilidad. — Suggestion: Keys deberían ser SIEMPRE en inglés
              [
                { key: 'marca', label: 'Marca' },
                { key: 'modelo', label: 'Modelo' },
                { key: 'anio', label: 'Año' },
                { key: 'color', label: 'Color' },
                { key: 'patente', label: 'Patente' },
              ]
              .map
              (
                ({ key, label }) =>
                (
                  <input key={key} type='text' placeholder={label} onChange={(e) => setNuevo((n) => ({ ...n, [key]: e.target.value }))}/>
                )
              )
            }            
          </div>
          {/* Fin campos en grid */}

          {/* fila de archivos: documentos y foto en dos columnas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
            }}
          >
            <div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 150px' }}>
                  <FilePicker
                    label="Cédula de automotor"
                    accept="image/*,application/pdf"
                    file={filesNuevo.cedulaFile}
                    onSelect={(f) => setFilesNuevo((fprev) => ({ ...fprev, cedulaFile: f }))}
                  />
                  {uploadStatusNuevo.cedulaFile === 'uploading' && (
                    <div style={{ fontSize: 12, color: '#555' }}>Subiendo...</div>
                  )}
                  {uploadStatusNuevo.cedulaFile === 'error' && (
                    <div style={{ fontSize: 12, color: colors.error }}>Falló la carga</div>
                  )}
                </div>
                <div style={{ flex: '1 1 150px' }}>
                  <FilePicker
                    label="Seguro"
                    accept="image/*,application/pdf"
                    file={filesNuevo.seguroFile}
                    onSelect={(f) => setFilesNuevo((fprev) => ({ ...fprev, seguroFile: f }))}
                  />
                  {uploadStatusNuevo.seguroFile === 'uploading' && (
                    <div style={{ fontSize: 12, color: '#555' }}>Subiendo...</div>
                  )}
                  {uploadStatusNuevo.seguroFile === 'error' && (
                    <div style={{ fontSize: 12, color: colors.error }}>Falló la carga</div>
                  )}
                </div>
                <div style={{ flex: '1 1 150px' }}>
                  <FilePicker
                    label="VTV"
                    accept="image/*,application/pdf"
                    file={filesNuevo.vtvFile}
                    onSelect={(f) => setFilesNuevo((fprev) => ({ ...fprev, vtvFile: f }))}
                  />
                  {uploadStatusNuevo.vtvFile === 'uploading' && (
                    <div style={{ fontSize: 12, color: '#555' }}>Subiendo...</div>
                  )}
                  {uploadStatusNuevo.vtvFile === 'error' && (
                    <div style={{ fontSize: 12, color: colors.error }}>Falló la carga</div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <FilePicker
                label="Foto del vehículo"
                accept="image/*"
                file={filesNuevo.imagenFile}
                onSelect={(f) => setFilesNuevo((fprev) => ({ ...fprev, imagenFile: f }))}
              />
              {filesNuevo.imagenFile && (
                <img
                  src={URL.createObjectURL(filesNuevo.imagenFile)}
                  alt="Preview"
                  style={{ width: '100%', borderRadius: 8, objectFit: 'cover', marginTop: 4 }}
                />
              )}
              {uploadStatusNuevo.imagenFile === 'uploading' && (
                <div style={{ fontSize: 12, color: '#555' }}>Subiendo imagen...</div>
              )}
              {uploadStatusNuevo.imagenFile === 'error' && (
                <div style={{ fontSize: 12, color: colors.error }}>Falló la carga de la imagen</div>
              )}
            </div>
          </div>

          {/* acciones */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <ActionButton onClick={agregarVehiculo} variant="neutral" disabled={savingNuevo}>
              {savingNuevo ? 'Guardando...' : 'Agregar vehículo'}
            </ActionButton>
            <ActionButton
              onClick={() => {
                setNuevo({ marca: '', modelo: '', anio: '', color: '', patente: '', asientos: 4 });
                setFilesNuevo({ imagenFile: null, cedulaFile: null, seguroFile: null, vtvFile: null });
                setErrorsNuevo({});
                setUploadStatusNuevo({});
              }}
              variant="destructive"
            >
              Cancelar
            </ActionButton>
          </div>
        </div>
      )}

      {activeSubTab === 'gestionar' && (
        <div>
          {loadingVehiculos ? (
            <div style={{ color: '#555' }}>Cargando vehículos...</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {vehiculos.map((v) => {
                const editState = editStates[v.id] || {};
                const isEditing = editState.edit;
                return (
                  <li key={v.id} style={{ ...shared.card, alignItems: 'start' }}>
                    {v.imagenURL && (
                      <div style={{ flex: '0 0 160px' }}>
                        <img src={v.imagenURL} alt="Vehículo" style={shared.image} />
                      </div>
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {isEditing ? (
                        <>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))',
                              gap: 12,
                            }}
                          >
                            {['marca', 'modelo', 'anio', 'color', 'patente'].map((field) => (
                              <div key={field}>
                                <label style={shared.label} htmlFor={`${v.id}-${field}`}>
                                  {field.charAt(0).toUpperCase() + field.slice(1)}
                                </label>
                                <input
                                  id={`${v.id}-${field}`}
                                  value={editState.form?.[field] || ''}
                                  onChange={handleEditChange(v.id, field)}
                                  style={{
                                    ...shared.input,
                                    borderColor: editState.errors?.[field]
                                      ? colors.error
                                      : shared.input.border,
                                  }}
                                  aria-invalid={!!editState.errors?.[field]}
                                />
                                {editState.errors?.[field] && (
                                  <div style={{ color: colors.error, fontSize: 12 }}>
                                    {editState.errors[field]}
                                  </div>
                                )}
                              </div>
                            ))}
                            <div>
                              <label style={shared.label} htmlFor={`${v.id}-asientos`}>
                                Asientos
                              </label>
                              <input
                                id={`${v.id}-asientos`}
                                type="number"
                                min={1}
                                value={editState.form?.asientos || 1}
                                onChange={(e) =>
                                  setEditStates((s) => ({
                                    ...s,
                                    [v.id]: {
                                      ...(s[v.id] || {}),
                                      form: {
                                        ...(s[v.id]?.form || {}),
                                        asientos: +e.target.value,
                                      },
                                    },
                                  }))
                                }
                                style={shared.input}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ fontWeight: 500 }}>Foto del vehículo</div>
                              <FilePicker
                                label=""
                                accept="image/*"
                                file={editState.files?.imagenFile || null}
                                onSelect={(f) => handleEditFileChange(v.id, 'imagenFile', f)}
                                placeholder={v.imagenURL ? 'Actualizar' : 'Seleccionar'}
                              />
                              {(editState.files?.imagenFile || v.imagenURL) && (
                                <div>
                                  {editState.files?.imagenFile ? (
                                    <img
                                      src={URL.createObjectURL(editState.files.imagenFile)}
                                      alt="Preview"
                                      style={{ width: 120, borderRadius: 6, objectFit: 'cover' }}
                                    />
                                  ) : (
                                    v.imagenURL && (
                                      <img
                                        src={v.imagenURL}
                                        alt="Vehículo"
                                        style={{ width: 120, borderRadius: 6, objectFit: 'cover' }}
                                      />
                                    )
                                  )}
                                </div>
                              )}
                              {editState.uploadStatus?.imagenFile === 'uploading' && (
                                <div style={{ fontSize: 12, color: '#555' }}>Subiendo imagen...</div>
                              )}
                              {editState.uploadStatus?.imagenFile === 'error' && (
                                <div style={{ fontSize: 12, color: colors.error }}>Falló la carga</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                              {[
                                { key: 'cedulaFile', label: 'Cédula de automotor' },
                                { key: 'seguroFile', label: 'Seguro' },
                                { key: 'vtvFile', label: 'VTV' },
                              ].map(({ key, label }) => (
                                <div key={key} style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div style={{ fontWeight: 500 }}>{label}</div>
                                  {v[`${key.replace('File', '')}URL`] && (
                                    <div>
                                      <a
                                        href={v[`${key.replace('File', '')}URL`]}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ fontSize: 12, color: colors.primary }}
                                      >
                                        Ver {label}
                                      </a>
                                    </div>
                                  )}
                                  <FilePicker
                                    label=""
                                    accept="image/*,application/pdf"
                                    file={editState.files?.[key] || null}
                                    onSelect={(f) => handleEditFileChange(v.id, key, f)}
                                    placeholder="Actualizar"
                                  />
                                  {editState.uploadStatus?.[key] === 'uploading' && (
                                    <div style={{ fontSize: 12, color: '#555' }}>Subiendo...</div>
                                  )}
                                  {editState.uploadStatus?.[key] === 'error' && (
                                    <div style={{ fontSize: 12, color: colors.error }}>Falló la carga</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div style={{ marginTop: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <ActionButton onClick={() => saveEdit(v)} variant="success" disabled={editState.saving}>
                              {editState.saving ? 'Guardando...' : 'Guardar'}
                            </ActionButton>
                            <ActionButton onClick={() => cancelEdit(v.id)} variant="neutral">
                              Cancelar
                            </ActionButton>
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))',
                              gap: 12,
                            }}
                          >
                            <div>
                              <strong>Marca:</strong> {v.marca}
                            </div>
                            <div>
                              <strong>Modelo:</strong> {v.modelo}
                            </div>
                            <div>
                              <strong>Año:</strong> {v.anio}
                            </div>
                            <div>
                              <strong>Color:</strong> {v.color}
                            </div>
                            <div>
                              <strong>Patente:</strong> {v.patente}
                            </div>
                            <div>
                              <strong>Asientos:</strong> {v.asientos}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                            {v.cedulaURL && (
                              <a href={v.cedulaURL} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: colors.primary }}>
                                Ver Cédula
                              </a>
                            )}
                            {v.seguroURL && (
                              <a href={v.seguroURL} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: colors.primary }}>
                                Ver Seguro
                              </a>
                            )}
                            {v.vtvURL && (
                              <a href={v.vtvURL} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: colors.primary }}>
                                Ver VTV
                              </a>
                            )}
                          </div>

                          <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                            <ActionButton onClick={() => startEdit(v)} variant="neutral">
                              Editar
                            </ActionButton>
                            <ActionButton onClick={() => eliminarVehiculo(v.id)} variant="destructive">
                              Eliminar
                            </ActionButton>
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default VehiculosConductor;