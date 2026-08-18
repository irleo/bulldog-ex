import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Cart from '../models/cartModel.js';
import Category from '../models/categoryModel.js';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import Review from '../models/reviewModel.js';
import User from '../models/userModel.js';

const objectIds = Array.from({ length: 8 }, () => new mongoose.Types.ObjectId());

const expectValidationFailure = async (label, document, expectedPath) => {
  try {
    await document.validate();
  } catch (error) {
    assert(error instanceof mongoose.Error.ValidationError, `${label}: wrong error type`);
    assert(expectedPath in error.errors, `${label}: missing ${expectedPath} error`);
    console.log(`PASS invalid ${label}: ${error.errors[expectedPath].message}`);
    return;
  }

  throw new Error(`${label} unexpectedly passed validation.`);
};

const validateModels = async () => {
  await expectValidationFailure(
    'category name',
    new Category({ name: 'A' }),
    'name',
  );
  await expectValidationFailure(
    'product price',
    new Product({
      name: 'Valid Product',
      sku: 'TEST-001',
      price: -1,
      stock: 1,
      categoryId: objectIds[0],
    }),
    'price',
  );
  await expectValidationFailure(
    'user email',
    new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'invalid-email',
      passwordHash: 'a-valid-demo-password-hash',
    }),
    'email',
  );
  await expectValidationFailure(
    'duplicate cart product',
    new Cart({
      userId: objectIds[1],
      items: [
        { productId: objectIds[2], quantity: 1 },
        { productId: objectIds[2], quantity: 2 },
      ],
    }),
    'items',
  );
  await expectValidationFailure(
    'empty order',
    new Order({
      userId: objectIds[3],
      items: [],
      shippingAddress: {
        recipientName: 'Test User',
        street: 'Test Street',
        city: 'Manila',
        province: 'Metro Manila',
        postalCode: '1000',
      },
      phone: '09171234567',
    }),
    'items',
  );
  await expectValidationFailure(
    'review rating',
    new Review({
      productId: objectIds[4],
      userId: objectIds[5],
      rating: 6,
      content: 'This review intentionally contains an invalid rating.',
    }),
    'rating',
  );

  const validProduct = new Product({
    name: 'Valid Product',
    sku: 'VALID-001',
    price: 500,
    stock: 10,
    categoryId: objectIds[6],
  });
  await validProduct.validate();
  assert.equal(validProduct.slug, 'valid-product');
  console.log('PASS valid product and automatic slug generation.');
};

validateModels().catch((error) => {
  console.error('Model validation checks failed:', error);
  process.exitCode = 1;
});
