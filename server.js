// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Endpoint de prueba para verificar que el servidor esté arriba
app.get('/', (req, res) => res.send('🚀 Backend de MercadoPago corriendo'));

// Inicializar cliente de MercadoPago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

// Ruta para crear preferencia de pago
app.post('/create_preference', async (req, res) => {
  try {
    const preferenceData = {
      ...req.body,
      back_urls: {
        success: process.env.URL_SUCCESS,
        failure: process.env.URL_FAILURE,
        pending: process.env.URL_PENDING
      },
      auto_return: 'approved'
    };

    // Crear preferencia usando el SDK
    const mpResponse = await new Preference(client).create({ body: preferenceData });
    console.log('🎯 MP raw response:', mpResponse);

    // Extraer init_point según versión del SDK
    const data = mpResponse.body ?? mpResponse.data ?? mpResponse;
    const init_point = data.init_point;

    if (!init_point) {
      console.error('❌ init_point no definido en respuesta:', data);
      return res.status(500).json({ error: 'init_point no definido', raw: data });
    }

    return res.json({ init_point });
  } catch (error) {
    console.error('❌ Error creando preferencia:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Webhook para notificaciones de MercadoPago
app.post('/webhook/mp', (req, res) => {
  const topic = req.query.topic;
  const id = req.query.id || req.body.data?.id;
  console.log(`Notificación MP — topic: ${topic}, id: ${id}`);
  res.sendStatus(200);
});

// Iniciar servidor con manejo de errores de puerto
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () =>
  console.log(`Servidor MP corriendo en http://localhost:${PORT}`)
);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ El puerto ${PORT} ya está en uso. Cerrá el proceso anterior o elegí otro puerto cambiando la variable PORT en tu .env.`);
    process.exit(1);
  } else {
    console.error('❌ Error del servidor:', err);
    process.exit(1);
  }
});
