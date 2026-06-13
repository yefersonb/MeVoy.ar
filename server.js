require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const admin      = require('firebase-admin');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ─── Firebase Admin ───────────────────────────────────────────────────────────
// Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service-account
// JSON file, OR set FIREBASE_SERVICE_ACCOUNT to an inline JSON string.
// In dev, download the key from Firebase console → Project settings → Service accounts.
let adminDb = null;
try {
    const credential = process.env.FIREBASE_SERVICE_ACCOUNT
        ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
        : admin.credential.applicationDefault();

    admin.initializeApp({ credential });
    adminDb = admin.firestore();
    console.log('Firebase Admin initialised.');
} catch (err) {
    console.warn('Firebase Admin NOT initialised — webhook will not update Firestore.', err.message);
}

// ─── MercadoPago ──────────────────────────────────────────────────────────────
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('MeVoy backend running'));

// ─── Create payment preference ────────────────────────────────────────────────
app.post('/create_preference', async (req, res) => {
    try {
        const preferenceData = {
            ...req.body,
            back_urls: {
                success: process.env.URL_SUCCESS,
                failure: process.env.URL_FAILURE,
                pending: process.env.URL_PENDING,
            },
            auto_return: 'approved',
        };

        const mpResponse = await new Preference(client).create({ body: preferenceData });
        console.log('MP preference created:', mpResponse?.id);

        const data       = mpResponse.body ?? mpResponse.data ?? mpResponse;
        const init_point = data.init_point;

        if (!init_point) {
            console.error('init_point missing in MP response:', data);
            return res.status(500).json({ error: 'init_point missing', raw: data });
        }

        return res.json({ init_point, preferenceId: data.id });
    } catch (error) {
        console.error('Error creating preference:', error);
        return res.status(500).json({ error: error.message });
    }
});

// ─── MercadoPago payment webhook ──────────────────────────────────────────────
// MP sends a POST to this URL when a payment changes status.
// Configure the notification URL in MP dashboard → Notifications.
app.post('/webhook/mp', async (req, res) => {
    const topic     = req.query.topic || req.body.type;
    const paymentId = req.query.id    || req.body.data?.id;

    console.log(`MP webhook — topic: ${topic}, id: ${paymentId}`);

    // MP also sends non-payment topics (e.g. "merchant_order") — skip them.
    if (!paymentId || (topic && topic !== 'payment')) {
        return res.sendStatus(200);
    }

    if (!adminDb) {
        console.warn('Firestore Admin not available — skipping reservation update.');
        return res.sendStatus(200);
    }

    try {
        // Fetch full payment details from MP
        const paymentData = await new Payment(client).get({ id: paymentId });
        const payment     = paymentData.body ?? paymentData;

        const { status, preference_id } = payment;
        console.log(`Payment ${paymentId} status: ${status}, preference: ${preference_id}`);

        if (!preference_id) {
            console.warn('No preference_id in payment — cannot match reservation.');
            return res.sendStatus(200);
        }

        // Find the reservation linked to this preference
        const snap = await adminDb
            .collectionGroup('reservas')
            .where('mpPreferenceId', '==', preference_id)
            .limit(1)
            .get();

        if (snap.empty) {
            console.warn('No reservation found for preference:', preference_id);
            return res.sendStatus(200);
        }

        const reservationRef  = snap.docs[0].ref;
        const currentStatus   = snap.docs[0].data().estadoReserva;

        // Only advance if still waiting for payment confirmation
        if (currentStatus !== 'accepted') {
            console.log(`Reservation already in state "${currentStatus}" — skipping.`);
            return res.sendStatus(200);
        }

        const newStatus = status === 'approved' ? 'confirmed' : 'payment_failed';
        await reservationRef.update({
            estadoReserva:    newStatus,
            mpPaymentId:      String(paymentId),
            mpPaymentStatus:  status,
            paymentMethod:    'mercadopago',
            paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Reservation ${reservationRef.id} → ${newStatus}`);
        return res.sendStatus(200);
    } catch (err) {
        console.error('Webhook processing error:', err);
        // Always return 200 to MP so it stops retrying on our logic errors.
        return res.sendStatus(200);
    }
});

// ─── Release payment (simulator + real MP) ───────────────────────────────────
// Called by the driver's "Finalizar viaje" action.
// For the simulator, it's a no-op that just logs.
// For real MP, plug in the marketplace split or fund-release API call here.
app.post('/release_payment', async (req, res) => {
    const { simulatedPaymentId, mpPaymentId, tripId, reservationId } = req.body;

    if (simulatedPaymentId) {
        console.log(`[Simulator] Releasing payment ${simulatedPaymentId} for trip ${tripId}`);
        return res.json({ released: true, mode: 'simulator' });
    }

    if (mpPaymentId) {
        // TODO: implement real MP fund release via Marketplace API when ready
        console.log(`[MP] Fund release for payment ${mpPaymentId} — not yet implemented`);
        return res.json({ released: false, mode: 'mercadopago', message: 'MP release not implemented' });
    }

    return res.status(400).json({ error: 'No payment ID provided' });
});

// ─── Server startup ───────────────────────────────────────────────────────────
const PORT   = process.env.PORT || 3001;
const server = app.listen(PORT, () =>
    console.log(`MeVoy backend listening on http://localhost:${PORT}`)
);

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} already in use. Kill the previous process or set PORT in .env`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
