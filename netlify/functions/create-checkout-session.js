// Creates a Stripe Checkout Session with the customer's package, care plan,
// and add-on selections already set — nothing left to re-pick at checkout.
//
// Called by index.html via POST /.netlify/functions/create-checkout-session
// with JSON body: { package, wantsCare, rush, domain, logo, businessName, email }
//
// On any failure, returns a non-200 response. The site's own JS (see
// goToCheckout() in index.html) catches that and falls back to the original
// static Stripe Payment Links, so checkout never breaks entirely even if
// this function, the Stripe key, or Stripe itself has a problem.
//
// Requires the STRIPE_SECRET_KEY environment variable to be set in Netlify
// (Site settings -> Environment variables). Use a RESTRICTED key scoped to
// "Checkout Sessions: Write" only, never the full secret key.

const Stripe = require('stripe');

// Live-mode Price IDs, confirmed against the Payment Links actually in use
// on larkwell.com.au as of July 2026. If a price ever changes in the Stripe
// Dashboard, update the ID here too, the two have to stay in sync manually.
const PRICE_IDS = {
  package: {
    starter: 'price_1Tq4KGJDrTup0PmEBV6Kxfag', // Launch, $489
    standard: 'price_1Tq4QBJDrTup0PmEjmgoeB4G', // Grow, $839
    premium: 'price_1Tq4RhJDrTup0PmEe04amBL3', // Thrive, $1,259
    ultimate: 'price_1Tq3zOJDrTup0PmEjvwXymlh' // Everything, $2,099
  },
  care: 'price_1Tq3Y6JDrTup0PmEHrrl09xF', // Larkwell Care Plan, $49/month
  // domain: 'price_1Tq411JDrTup0PmE98tgOYZO', // Domain setup add-on, $39.
  // REMOVED FROM CHECKOUT: as of the emailed-invoice model, the domain is
  // never a Stripe line item. Larkwell registers it, covers year one, then
  // emails the customer a custom invoice (actual cost + 20% first-year fee).
  // Price ID kept here, commented out, only as a record of the old add-on.
  logo: 'price_1Tq3zrJDrTup0PmEGLELOJnr', // Logo design add-on, $149
  rush: 'price_1Tq40PJDrTup0PmEEaAiW557' // Rush delivery add-on, $199
};

// Page copy promises 3 months free care plan when it's bundled with
// Everything. Turned on here per your call on 8 July 2026 (this trial was
// not actually configured on the live Payment Link before now).
const EVERYTHING_CARE_TRIAL_DAYS = 90;

const SITE_URL = 'https://www.larkwell.com.au';

// Mirrors the slug rule already used in index.html's buildPayUrl(), so
// client_reference_id looks the same in the Stripe Dashboard either way.
function slugify(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// Pure decision logic, pulled out on its own so it can be unit tested
// (see scripts/test-checkout-logic.js) without ever calling Stripe. Given a
// selection, returns the exact Checkout Session params that will be sent,
// or throws if the package is unrecognised.
function buildSessionParams(selection) {
  const pkg = selection.package;
  const wantsCare = !!selection.wantsCare;
  // selection.domain is intentionally ignored: the domain is no longer a
  // paid Stripe line item, it is handled by a separate emailed invoice.
  const wantsLogo = !!selection.logo;
  const wantsRush = !!selection.rush;
  const businessName = selection.businessName;
  const email = selection.email;

  const packagePriceId = PRICE_IDS.package[pkg];
  if (!packagePriceId) {
    const err = new Error('Unknown package: ' + pkg);
    err.statusCode = 400;
    throw err;
  }

  const lineItems = [{ price: packagePriceId, quantity: 1 }];
  if (wantsCare) lineItems.push({ price: PRICE_IDS.care, quantity: 1 });
  // Domain is deliberately NOT added as a line item, it is invoiced separately by email.
  if (wantsLogo) lineItems.push({ price: PRICE_IDS.logo, quantity: 1 });
  if (wantsRush) lineItems.push({ price: PRICE_IDS.rush, quantity: 1 });

  const sessionParams = {
    mode: wantsCare ? 'subscription' : 'payment',
    line_items: lineItems,
    success_url: SITE_URL + '/?checkout=success#pay',
    cancel_url: SITE_URL + '/?checkout=cancelled#pay'
  };

  const ref = slugify(businessName);
  if (ref) sessionParams.client_reference_id = ref;
  if (email && email.trim()) sessionParams.customer_email = email.trim();

  // One-time items in subscription mode are still charged immediately;
  // only the recurring (care plan) item's first charge is pushed out by
  // the trial. That's what makes "pay for the build now, care plan free
  // for 3 months" work in a single Checkout Session.
  if (wantsCare && pkg === 'ultimate') {
    sessionParams.subscription_data = { trial_period_days: EVERYTHING_CARE_TRIAL_DAYS };
  }

  return sessionParams;
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    // Not logged with the key value, just that it's missing, so the site
    // falls back to static links instead of hanging on a broken call.
    console.error('create-checkout-session: STRIPE_SECRET_KEY is not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'Checkout is not configured' }) };
  }

  try {
    const sessionParams = buildSessionParams(payload);
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    // Netlify keeps this in the function's own log (Netlify dashboard ->
    // Functions -> create-checkout-session), which is the place to check if
    // customers start silently landing on the static Payment Link fallback.
    console.error('create-checkout-session failed:', err && err.message ? err.message : err);
    return {
      statusCode: err && err.statusCode ? err.statusCode : 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err && err.statusCode ? err.message : 'Could not create checkout session' })
    };
  }
};

// Exported only so scripts/test-checkout-logic.js can exercise the exact
// same decision logic the live function uses, without needing a Stripe key.
exports.buildSessionParams = buildSessionParams;
exports.PRICE_IDS = PRICE_IDS;
