// src/components/vehicleVerification/Step3Ownership.jsx
import React, { useState, useRef } from "react";
import { Button } from "../ui/button";


export default function Step3Ownership({ initialData = {}, onNext }) {
  const [file, setFile] = useState(initialData.docFile || null);
  const [previewUrl, setPreviewUrl] = useState(initialData.docUrl || "");
  const [vehicleId, setVehicleId] = useState(initialData.vehicleId || "");
  const [errors, setErrors] = useState({ file: "", vehicleId: "" });
  const fileInputRef = useRef();

  const validate = () => {
    const errs = { file: "", vehicleId: "" };
    if (!file) errs.file = "Subí tu cédula verde o título (foto o PDF)";
    if (!vehicleId.trim()) errs.vehicleId = "Ingresa el dominio o número de motor";
    setErrors(errs);
    return !errs.file && !errs.vehicleId;
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
    onNext({ docFile: file, docUrl: previewUrl, vehicleId });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Paso 3/3: Titularidad del vehículo</h2>

      <label className="block mb-2 font-medium">Cédula verde o título</label>
      <div className="mb-4">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="block w-full"
        />
        {errors.file && <p className="text-red-500 text-sm mt-1">{errors.file}</p>}
      </div>

      {previewUrl && (
        <div className="mb-4">
          {file.type.includes("image") ? (
            <img
              src={previewUrl}
              alt="Preview Ownership"
              className="h-40 object-contain rounded"
            />
          ) : (
            <div className="p-4 bg-gray-100 rounded">
              <p className="break-all">{file.name}</p>
            </div>
          )}
        </div>
      )}

      <label className="block mb-2 font-medium">Dominio o número de motor</label>
      <input
        type="text"
        value={vehicleId}
        onChange={(e) => {
          setVehicleId(e.target.value);
          setErrors((prev) => ({ ...prev, vehicleId: "" }));
        }}
        className="block w-full mb-1"
      />
      {errors.vehicleId && (
        <p className="text-red-500 text-sm mb-4">{errors.vehicleId}</p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={!file || !vehicleId.trim() || errors.file || errors.vehicleId}
        >
          Finalizar
        </Button>
      </div>
    </div>
  );
}
