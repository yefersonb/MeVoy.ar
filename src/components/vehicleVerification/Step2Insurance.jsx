// src/components/vehicleVerification/Step2Insurance.jsx
import React, { useState, useRef } from "react";
import { Button } from "../ui/button";


export default function Step2Insurance({ initialData = {}, onNext }) {
  const [file, setFile] = useState(initialData.docFile || null);
  const [previewUrl, setPreviewUrl] = useState(initialData.docUrl || "");
  const [expiresAt, setExpiresAt] = useState(
    initialData.expiresAt
      ? new Date(initialData.expiresAt).toISOString().substr(0, 10)
      : ""
  );
  const [errors, setErrors] = useState({ file: "", expiresAt: "" });
  const fileInputRef = useRef();

  const validate = () => {
    const errs = { file: "", expiresAt: "" };
    if (!file) errs.file = "Subí tu póliza de seguro (foto o PDF)";
    if (!expiresAt) {
      errs.expiresAt = "Seleccioná fecha de vencimiento";
    } else if (new Date(expiresAt) <= new Date().setHours(0, 0, 0, 0)) {
      errs.expiresAt = "La fecha debe ser posterior a hoy";
    }
    setErrors(errs);
    return !errs.file && !errs.expiresAt;
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setErrors((prev) => ({ ...prev, file: "" }));
    }
  };

  const handleNext = () => {
    if (!validate()) return;
    onNext({ docFile: file, docUrl: previewUrl, expiresAt });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Paso 2/3: Seguro obligatorio</h2>

      <label className="block mb-2 font-medium">Póliza de seguro</label>
      <div className="mb-4">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="block w-full"
        />
        {errors.file && (
          <p className="text-red-500 text-sm mt-1">{errors.file}</p>
        )}
      </div>

      {previewUrl && (
        <div className="mb-4">
          {file.type.includes("image") ? (
            <img
              src={previewUrl}
              alt="Preview Seguro"
              className="h-40 object-contain rounded"
            />
          ) : (
            <div className="p-4 bg-gray-100 rounded">
              <p className="break-all">{file.name}</p>
            </div>
          )}
        </div>
      )}

      <label className="block mb-2 font-medium">Fecha de vencimiento</label>
      <input
        type="date"
        value={expiresAt}
        onChange={(e) => {
          setExpiresAt(e.target.value);
          setErrors((prev) => ({ ...prev, expiresAt: "" }));
        }}
        className="block w-full mb-1"
      />
      {errors.expiresAt && (
        <p className="text-red-500 text-sm mb-4">{errors.expiresAt}</p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={!file || !expiresAt || errors.file || errors.expiresAt}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
