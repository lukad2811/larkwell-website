// Run with: STRIPE_TEST_SECRET_KEY=sk_test_xxx node scripts/test-checkout-live.js
//
// Real Stripe test-mode smoke test. Takes the exact same session params the
// live function would build (via buildSessionParams), swaps the live Price
// IDs for inline price_data of the same amounts (test mode can't see live
// Price IDs, they're separate catalogs), then actually creates and retrieves
// a Checkout Session from Stripe for a handful of representative selections.
// This proves the Stripe integration itself works (auth, API version, line
// item shape), on top of the pure-logic checks in test-checkout-logic.js.
//
// Never commits or prints the key. Reads it from an environment variable
// only, for this one run.

const Stripe = require('stripe');
const { buildSessionParams, PRICE_IDS } = require('../netlify/functions/create-checkout-session.js');

const key = process.env.STRIPE_TEST_SECRET_KEY;
const looksLikeTestKey = !!key && (key.indexOf('sk_test_') === 0 || key.indexOf('rk_test_') === 0);
if (!looksLikeTestKey) {
  console.error('Set STRIPE_TEST_SECRET_KEY to a Stripe TEST secret/restricted key (starts with sk_test_ or rk_test_) before running this.');
  process.exit(1);
}

const stripe = Stripe(key);

// live Price ID -> equivalent test-mode price_data, same name/amount/interval
const TEST_PRICE_DATA = {};
TEST_PRICE_DATA[PRICE_IDS.package.starter] = { name: 'Launch package', amount: 48900 };
TEST_PRICE_DATA[PRICE_IDS.package.standard] = { name: 'Grow package', amount: 83900 };
TEST_PRICE_DATA[PRICE_IDS.package.premium] = { name: 'Thrive package', amount: 125900 };
TEST_PRICE_DATA[PRICE_IDS.package.ultimate] = { name: 'Everything package', amount: 209900 };
TEST_PRICE_DATA[PRICE_IDS.care] = { name: 'Larkwell Care Plan', amount: 4900, recurring: true };
// Domain removed: it is no longer a Stripe line item (invoiced separately by
// email), so there is no test price_data for it and no scenario should charge it.
TEST_PRICE_DATA[PRICE_IDS.logo] = { name: 'Logo design add-on', amount: 14900 };
TEST_PRICE_DATA[PRICE_IDS.rush] = { name: 'Rush delivery add-on', amount: 19900 };

function toTestLineItems(lineItems) {
  return lineItems.map(function (li) {
    const info = TEST_PRICE_DATA[li.price];
    const priceData = { currency: 'aud', unit_amount: info.amount, product_data: { name: info.name } };
    if (info.recurring) priceData.recurring = { interval: 'month' };
    return { price_data: priceData, quantity: li.quantity };
  });
}

const scenarios = [
  { label: 'Launch, nothing else', selection: { package: 'starter', businessName: 'Test Launch Co', email: 'launch@example.com' }, expectAud: 489 },
  // domain:true is deliberately kept here to PROVE selecting a domain adds
  // nothing to the Stripe total any more (it is invoiced separately by email).
  { label: 'Grow + domain(selected, NOT charged) + logo', selection: { package: 'standard', domain: true, logo: true, businessName: 'Test Grow Co', email: 'grow@example.com' }, expectAud: 839 + 149 },
  { label: 'Thrive + care plan', selection: { package: 'premium', wantsCare: true, businessName: 'Test Thrive Co', email: 'thrive@example.com' }, expectAud: 1259, expectMonthlyAud: 49, expectTrial: false },
  { label: 'Everything + care plan + rush', selection: { package: 'ultimate', wantsCare: true, rush: true, businessName: 'Test Everything Co', email: 'everything@example.com' }, expectAud: 2099 + 199, expectMonthlyAud: 49, expectTrial: true }
];

(async function run() {
  let failed = 0;
  for (const scenario of scenarios) {
    try {
      const params = buildSessionParams(scenario.selection);
      params.line_items = toTestLineItems(params.line_items);

      const session = await stripe.checkout.sessions.create(params);
      const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] });

      const oneTimeTotalCents = full.line_items.data
        .filter(function (li) { return !li.price.recurring; })
        .reduce(function (sum, li) { return sum + li.amount_total; }, 0);
      const monthlyItem = full.line_items.data.find(function (li) { return li.price.recurring; });

      const oneTimeOk = oneTimeTotalCents === scenario.expectAud * 100;
      const monthlyOk = scenario.expectMonthlyAud
        ? (monthlyItem && monthlyItem.price.unit_amount === scenario.expectMonthlyAud * 100)
        : !monthlyItem;
      const trialOk = scenario.expectTrial === undefined
        ? true
        : (!!(full.subscription === null && params.subscription_data && params.subscription_data.trial_period_days === 90) === scenario.expectTrial || scenario.expectTrial === !!(params.subscription_data && params.subscription_data.trial_period_days));

      const ok = oneTimeOk && monthlyOk && trialOk && !!full.url;

      console.log((ok ? 'PASS' : 'FAIL') + ' — ' + scenario.label);
      console.log('  mode: ' + full.mode + ', due now: $' + (oneTimeTotalCents / 100).toFixed(2) + (monthlyItem ? ', then $' + (monthlyItem.price.unit_amount / 100).toFixed(2) + '/mo' : '') + (params.subscription_data ? ' (trial ' + params.subscription_data.trial_period_days + 'd)' : ''));
      console.log('  checkout url: ' + full.url);
      if (!ok) failed++;
    } catch (err) {
      failed++;
      console.log('FAIL — ' + scenario.label);
      console.log('  ' + (err && err.message ? err.message : err));
    }
  }
  console.log('\n' + scenarios.length + ' live scenarios run, ' + failed + ' failed.');
  process.exit(failed > 0 ? 1 : 0);
})();
