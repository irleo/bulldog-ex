import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { environment } from '../config/environment.js';
import Cart from '../models/cartModel.js';
import Category from '../models/categoryModel.js';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import Review from '../models/reviewModel.js';
import User from '../models/userModel.js';

const models = [Category, Product, User, Cart, Order, Review];

const assertCollectionsAreEmpty = async () => {
  const counts = await Promise.all(models.map((model) => model.countDocuments()));
  const populated = models
    .map((model, index) => ({ name: model.collection.collectionName, count: counts[index] }))
    .filter(({ count }) => count > 0);

  if (populated.length > 0) {
    const summary = populated.map(({ name, count }) => `${name}: ${count}`).join(', ');
    throw new Error(
      `Seed stopped to protect existing data. Non-empty collections: ${summary}.`,
    );
  }
};

const seedDatabase = async () => {
  /** @type {Map<import('mongoose').Model<unknown>, mongoose.Types.ObjectId[]>} */
  const insertedIds = new Map();

  try {
    await connectDatabase(environment.mongoUri);
    await assertCollectionsAreEmpty();

    const categories = await Category.insertMany([
      {
        name: 'Apparel',
      },
      {
        name: 'Accessories',
      },
      {
        name: 'Study Supplies',
      },
    ]);
    insertedIds.set(Category, categories.map(({ _id }) => _id));

    const users = await User.insertMany([
      {
        firstName: 'Ana',
        lastName: 'Santos',
        email: 'ana.santos@example.test',
        passwordHash: 'demo-hash-ana-not-for-production',
        phone: '09171234567',
        address: {
          street: '551 M. F. Jhocson Street',
          city: 'Manila',
          province: 'Metro Manila',
          postalCode: '1008',
        },
      },
      {
        firstName: 'Marco',
        lastName: 'Reyes',
        email: 'marco.reyes@example.test',
        passwordHash: 'demo-hash-marco-not-for-production',
        phone: '09181234567',
        address: {
          street: '1008 Legarda Street',
          city: 'Manila',
          province: 'Metro Manila',
          postalCode: '1008',
        },
      },
      {
        firstName: 'Lea',
        lastName: 'Cruz',
        email: 'lea.cruz@example.test',
        passwordHash: 'demo-hash-lea-not-for-production',
        role: 'admin',
        phone: '09191234567',
        address: {
          street: '12 Sampaloc Avenue',
          city: 'Manila',
          province: 'Metro Manila',
          postalCode: '1008',
        },
      },
    ]);
    insertedIds.set(User, users.map(({ _id }) => _id));

    const products = await Product.insertMany([
      {
        name: 'NU Athletic V1 Shirt',
        sku: 'NU-APP-001',
        price: 800,
        stock: 25,
        supplier: 'National University Store',
        categoryId: categories[0]._id,
        images: ['/images/nu-athletic-v1.png'],
      },
      {
        name: 'NU Scarf V2',
        sku: 'NU-ACC-001',
        price: 400,
        stock: 40,
        supplier: 'National University Store',
        categoryId: categories[1]._id,
        images: ['/images/nu-scarf-v2.png'],
      },
      {
        name: 'Bulldog Study Kit',
        sku: 'NU-STU-001',
        price: 350,
        stock: 60,
        supplier: 'Bulldog Essentials',
        categoryId: categories[2]._id,
        images: ['/images/bulldog-study-kit.jpg'],
      },
    ]);
    insertedIds.set(Product, products.map(({ _id }) => _id));

    const carts = await Cart.insertMany(
      users.map((user, index) => ({
        userId: user._id,
        items: [
          {
            productId: products[index]._id,
            quantity: index + 1,
          },
        ],
      })),
    );
    insertedIds.set(Cart, carts.map(({ _id }) => _id));

    const shippingAddress = {
      recipientName: 'Bulldogs Exchange Customer',
      street: '551 M. F. Jhocson Street',
      city: 'Manila',
      province: 'Metro Manila',
      postalCode: '1008',
    };
    const orders = await Order.insertMany(
      users.map((user, index) => {
        const quantity = index + 1;
        const product = products[index];
        return {
          userId: user._id,
          items: [
            {
              productId: product._id,
              productName: product.name,
              sku: product.sku,
              unitPrice: product.price,
              quantity,
              subtotal: product.price * quantity,
            },
          ],
          status: index === 0 ? 'pending' : index === 1 ? 'processing' : 'delivered',
          paymentStatus: index === 0 ? 'unpaid' : 'paid',
          shippingAddress: {
            ...shippingAddress,
            recipientName: `${user.firstName} ${user.lastName}`,
          },
          phone: user.phone,
          totalAmount: product.price * quantity,
        };
      }),
    );
    insertedIds.set(Order, orders.map(({ _id }) => _id));

    const reviews = await Review.insertMany([
      {
        productId: products[0]._id,
        userId: users[0]._id,
        rating: 5,
        content: 'The material is comfortable and the printed details look durable.',
        isApproved: true,
      },
      {
        productId: products[1]._id,
        userId: users[1]._id,
        rating: 4,
        content: 'The scarf colors are vibrant and it works well during school events.',
        isApproved: true,
      },
      {
        productId: products[2]._id,
        userId: users[2]._id,
        rating: 5,
        content: 'Every item in the kit is useful and the bundle is reasonably priced.',
        isApproved: true,
      },
    ]);
    insertedIds.set(Review, reviews.map(({ _id }) => _id));

    console.log('Seed completed: 3 documents inserted into each collection.');
  } catch (error) {
    for (const [model, ids] of [...insertedIds.entries()].reverse()) {
      if (ids.length > 0) {
        try {
          await model.deleteMany({ _id: { $in: ids } });
        } catch (cleanupError) {
          console.error(`Cleanup failed for ${model.modelName}:`, cleanupError);
        }
      }
    }

    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDatabase();
    }
  }
};

seedDatabase().catch((error) => {
  console.error('Database seed failed:', error);
  process.exitCode = 1;
});
