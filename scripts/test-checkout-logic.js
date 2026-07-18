// Run with: node scripts/test-checkout-logic.js
//
// Exercises buildSessionParams() from the actual checkout function for every
// package x care x domain x logo x rush combination, and checks the exact
// line items, mode, and trial that would be sent to Stripe. No network
// calls, no Stripe key needed, this only proves the selection logic itself
// is correct. See scripts/test-checkout-live.js for a real Stripe test-mode
// smoke test of the Stripe integration on top of this.

const assert = require('assert');
const { buildSessionParams, PRICE_IDS } = require('../netlify/functions/create-checkout-session.js');

const PACKAGES = ['starter', 'standard', 'premium', 'ultimate'];
const BOOL = [false, true];

let ran = 0;
let failed = 0;

function priceIdsOf(sessionParams) {
  return sessionParams.line_items.map(function (li) { return li.price; });
}

PACKAGES.forEach(function (pkg) {
  BOOL.forEach(function (wantsCare) {
    BOOL.forEach(function (domain) {
      BOOL.forEach(function (logo) {
        BOOL.forEach(function (rush) {
          ran++;
          const label = pkg + ' | care=' + wantsCare + ' domain=' + domain + ' logo=' + logo + ' rush=' + rush;
          try {
            const params = buildSessionParams({
              package: pkg,
              wantsCare: wantsCare,
              domain: domain,
              logo: logo,
              rush: rush,
              businessName: 'Test Business Pty Ltd',
              email: 'test@example.com'
            });

            const ids = priceIdsOf(params);

            // package price always present, exactly once
            assert.strictEqual(ids.filter(function (id) { return id === PRICE_IDS.package[pkg]; }).length, 1, 'package price missing/duplicated');

            // each optional item present iff selected, and nothing extra
            assert.strictEqual(ids.includes(PRICE_IDS.care), wantsCare, 'care line item mismatch');
            // Domain is NO LONGER a paid line item, it is handled by a separate
            // emailed invoice, so selecting a domain must add nothing to Stripe.
            // We assert the OLD domain price id never appears, no matter what
            // `domain` is set to in this iteration.
            assert.strictEqual(ids.indexOf('price_1Tq411JDrTup0PmE98tgOYZO'), -1, 'domain should never be a Stripe line item now');
            assert.strictEqual(ids.includes(PRICE_IDS.logo), logo, 'logo line item mismatch');
            assert.strictEqual(ids.includes(PRICE_IDS.rush), rush, 'rush line item mismatch');

            // domain deliberately excluded from the expected count
            const expectedCount = 1 + (wantsCare ? 1 : 0) + (logo ? 1 : 0) + (rush ? 1 : 0);
            assert.strictEqual(ids.length, expectedCount, 'line item count mismatch');

            // every item is quantity 1, nothing left adjustable/pre-ticked at a wrong qty
            params.line_items.forEach(function (li) { assert.strictEqual(li.quantity, 1, 'quantity should always be 1'); });

            // mode follows care plan (subscription only when recurring item present)
            assert.strictEqual(params.mode, wantsCare ? 'subscription' : 'payment', 'mode mismatch');

            // 3-month trial only for Everything + Care, never otherwise
            const shouldHaveTrial = wantsCare && pkg === 'ultimate';
            const hasTrial = !!(params.subscription_data && params.subscription_data.trial_period_days === 90);
            assert.strictEqual(hasTrial, shouldHaveTrial, 'trial mismatch');

            // customer matching fields always present when given
            assert.strictEqual(params.client_reference_id, 'test-business-pty-ltd', 'client_reference_id mismatch');
            assert.strictEqual(params.customer_email, 'test@example.com', 'customer_email mismatch');
          } catch (err) {
            failed++;
            console.error('FAIL: ' + label);
            console.error('  ' + err.message);
          }
        });
      });
    });
  });
});

// unknown package should throw a 400, not silently default to something
try {
  buildSessionParams({ package: 'not-a-real-package' });
  failed++;
  console.error('FAIL: unknown package did not throw');
} catch (err) {
  ran++;
  if (err.statusCode !== 400) {
    failed++;
    console.error('FAIL: unknown package threw but without statusCode 400');
  }
}

console.log(ran + ' combinations checked, ' + failed + ' failed.');
if (failed > 0) process.exit(1);
