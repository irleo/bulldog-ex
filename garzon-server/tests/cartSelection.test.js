import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartItemId, canCheckoutItem, selectedCartItems, selectedCartTotal } from '../../garzon-client/src/utils/cartSelection.js';
import { validateBody as serverValidate } from '../utils/validation.js';
import { validateBody as clientValidate } from '../../garzon-client/src/utils/validation.js';

const first = { productRef: 'a', productId: { _id: 'a', price: 10.25, stock: 5, isActive: true }, quantity: 2 };
const second = { productRef: 'b', productId: { _id: 'b', price: 0.29, stock: 5, isActive: true }, quantity: 3 };

test('selection totals include only checked available items with integer-cent arithmetic', () => {
  assert.equal(selectedCartTotal(selectedCartItems([first, second], ['b'])), 0.87);
  assert.equal(selectedCartTotal(selectedCartItems([first, second], ['a', 'b'])), 21.37);
  assert.deepEqual(selectedCartItems([first, second], []), []);
});

test('missing and unavailable products remain identifiable but cannot be checked out', () => {
  for (const item of [
    { ...first, productId: null },
    { ...first, productId: { ...first.productId, stock: 0 } },
    { ...first, productId: { ...first.productId, isActive: false } },
    { ...first, quantity: 6 },
    { ...first, productId: { ...first.productId, price: 0 } },
  ]) {
    assert.equal(cartItemId(item), 'a');
    assert.equal(canCheckoutItem(item), false);
    assert.deepEqual(selectedCartItems([item], ['a']), []);
  }
});

test('client and server validate non-empty unique bounded selection IDs', () => {
  const id = 'abcdefabcdefabcdefabcdef';
  const body = { cartId: id, revision: 0 };
  for (const validate of [serverValidate, clientValidate]) {
    for (const productIds of [[], null, 'all', [id, id], ['invalid'], [{ $ne: null }], Array(101).fill(id)]) {
      assert.throws(() => validate('/orders', 'POST', { ...body, productIds }));
    }
    assert.deepEqual(validate('/orders', 'POST', { ...body, productIds: [id.toUpperCase()] }).productIds, [id]);
    assert.deepEqual(validate('/orders', 'POST', body), body);
  }
});
