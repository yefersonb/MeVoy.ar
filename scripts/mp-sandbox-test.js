/*
  MercadoPago sandbox smoke test — no Express, no React, no Firestore.
  Walks through the same 3 steps MP's own docs use to teach Checkout Pro:

    1. Create a "preference" (a cart) → MP gives back a checkout URL.
    2. You open that URL and pay with one of MP's test cards.
    3. We look up the resulting payment by the preference id and print its status.

  This is the *simplest* MP flow: money is captured immediately when the
  test card is approved — there's no "hold it, release it later" here yet.
  That's a different MP mechanism (authorize now / capture later, `capture: false`
  on a direct payment) — see parked/mercadopago-raw-fetch.js, which already
  sketches that flow. We'll build a dedicated script for it once this one
  makes sense.

  Run:  node scripts/mp-sandbox-test.js
  Needs: MP_ACCESS_TOKEN in .env (already set to a TEST- sandbox token).
*/

require('dotenv').config();
const readline = require('readline');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const token = process.env.MP_ACCESS_TOKEN;
if (!token) {
    console.error('Missing MP_ACCESS_TOKEN in .env');
    process.exit(1);
}
if (!token.startsWith('TEST-')) {
    console.error('MP_ACCESS_TOKEN does not look like a sandbox token (expected it to start with "TEST-"). Refusing to run against what might be a real account.');
    process.exit(1);
}

const client = new MercadoPagoConfig({ accessToken: token });

function waitForEnter(prompt) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(prompt, () => { rl.close(); resolve(); }));
}

async function main() {
    // ── 1. Create a dummy preference ──────────────────────────────────────
    const external_reference = `sandbox-test-${Date.now()}`;

    const preference = await new Preference(client).create({
        body: {
            items: [{
                title: 'Viaje de prueba MeVoy',
                quantity: 1,
                unit_price: 1000,
                currency_id: 'ARS',
            }],
            external_reference,
        },
    });

    console.log('\nPreference created:', preference.id);
    console.log('\nOpen this URL and pay with an MP test card:');
    console.log(preference.init_point);
    console.log('\nTest cards: https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/additional-content/test-cards');

    // ── 2. Wait for you to actually pay in the browser ────────────────────
    await waitForEnter('\nPress Enter once you\'ve completed (or rejected) the test payment... ');

    // ── 3. Look up what happened, by the external_reference we set above ──
    const result = await new Payment(client).search({
        options: { external_reference },
    });

    const payments = result.results ?? [];
    if (!payments.length) {
        console.log('\nNo payment found yet for that preference — MP can take a few seconds. Re-run the search manually if needed.');
        return;
    }

    for (const p of payments) {
        console.log(`\nPayment ${p.id} — status: ${p.status} (${p.status_detail})`);
    }
}

main().catch((err) => {
    console.error('\nSandbox test failed:', err.message);
    process.exit(1);
});
