/*
  🔧 Módulo Mercado Pago para Express (sin SDK)
  Usa llamadas HTTP directas a la API v1 para evitar conflictos de versión.

  Antes de usar:
    1. En tu `.env` especificá el token correcto:
       - Para **sandbox** (pruebas): `MP_ACCESS_TOKEN=TU_TOKEN_SANDBOX` (obtenido en Pruebas > Credenciales de prueba).
       - Para **producción**: `MP_ACCESS_TOKEN=TU_TOKEN_PRODUCCION` (Producción > Credenciales de producción).
    2. Instalá dependencias:
       ```bash
       npm install node-fetch express dotenv
       ```

  🔧 Módulo Mercado Pago para Express (sin SDK)
  Usa llamadas HTTP directas a la API v1 para evitar conflictos de versión.

  Rutas:
    POST   /api/mp/create_payment   -> auth (capture diferido)
    PUT    /api/mp/:id/capture      -> captura total/parcial
    PUT    /api/mp/:id/cancel       -> cancela auth
    POST   /api/mp/webhook          -> recibe notificaciones (opcional)
*/

const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const router = express.Router();
const API_BASE = 'https://api.mercadopago.com';
const TOKEN = process.env.MP_ACCESS_TOKEN;
console.log('🔑 Mercado Pago Token cargado:', TOKEN ? TOKEN.slice(0, 10) + '...' : 'NO TOKEN');

// Helper para llamadas a MP
async function callMP(path, method, body, idempotencyKey) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      // En sandbox, forzar entorno de pruebas
      ...(TOKEN && TOKEN.startsWith('TEST-') ? { 'x-mp-sandbox': 'true' } : {}),
      ...(idempotencyKey && { 'X-Idempotency-Key': idempotencyKey })
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

// 1) Crear autorización (capture: false)
router.post('/create_payment', async (req, res) => {
  try {
    const idempotency = req.headers['x-idempotency-key'] || '';
    const body = {...req.body, capture: false};
    const result = await callMP('/v1/payments', 'POST', body, idempotency);
    res.status(201).json(result);
  } catch (err) {
    console.error('MP Create Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2) Capturar pago
router.put('/:id/capture', async (req, res) => {
  try {
    const path = `/v1/payments/${req.params.id}/capture`;
    const body = req.body.transaction_amount ? { transaction_amount: req.body.transaction_amount } : undefined;
    const result = await callMP(path, 'PUT', body);
    res.json(result);
  } catch (err) {
    console.error('MP Capture Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3) Cancelar autorización
router.put('/:id/cancel', async (req, res) => {
  try {
    const path = `/v1/payments/${req.params.id}/cancel`;
    const result = await callMP(path, 'PUT');
    res.json(result);
  } catch (err) {
    console.error('MP Cancel Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4) Webhook (opcional)
router.post('/webhook', express.json(), (req, res) => {
  console.log('MP Webhook:', req.headers, req.body);
  res.sendStatus(200);
});

module.exports = router;
