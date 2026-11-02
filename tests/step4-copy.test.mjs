import test from 'node:test';
import assert from 'node:assert/strict';
import {step4Copy} from '../lib/step4-copy.ts';

const paidOrder = (overrides = {}) => ({
  paymentStatus: 'paid',
  status: 'generating',
  generated: 1,
  deliveryStatus: 'pending',
  ...overrides,
});

test('step 4 copy reflects unpaid, generating, sent and failed delivery states', () => {
  assert.equal(step4Copy({...paidOrder(), paymentStatus: 'unpaid'}), 'Po potwierdzeniu płatności wyślemy gotową książeczkę jako załącznik PDF.');
  assert.equal(step4Copy(paidOrder()), 'Płatność przyjęta. Tworzymy Twoją książeczkę – wyślemy ją jako PDF na podany e-mail.');
  assert.equal(step4Copy(paidOrder({status: 'delivered', generated: 6, deliveryStatus: 'sent', email: 'reader@example.invalid'})), 'Gotowe! Książeczka PDF została wysłana na reader@example.invalid.');
  assert.match(step4Copy(paidOrder({deliveryStatus: 'failed'})), /Spróbuj ponownie.*skontaktuj się/);
});

test('sent confirmation remains clear when the email address is unavailable', () => {
  assert.match(step4Copy(paidOrder({deliveryStatus: 'sent'})), /na podany adres e-mail/);
});
