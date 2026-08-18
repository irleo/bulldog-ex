# Bulldogs Exchange API

Express and MongoDB backend for Laboratory Activity 2. The API implements the
Product, Category, Cart, Order, Review, and User collections using Mongoose.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to a local MongoDB database or MongoDB Atlas connection.
3. Start the API with `npm run dev`.
4. Verify `GET http://localhost:5000/api/health`.

The database seed will not overwrite existing documents. Run it only against an
empty activity database:

```bash
npm run seed
```

The optional model-validation script demonstrates required-field, range,
format, relationship, and custom validation behavior without connecting to a
database:

```bash
npm run validate:models
```

## Endpoints

All collection routes implement `GET /`, `POST /`, `GET /:id`, `PATCH /:id`,
and `DELETE /:id`.

| Collection | Base endpoint | Useful filters |
| --- | --- | --- |
| Categories | `/api/categories` | `q`, `isActive` |
| Products | `/api/products` | `q`, `categoryId`, `minPrice`, `maxPrice`, `isActive` |
| Carts | `/api/carts` | `userId` |
| Orders | `/api/orders` | `userId`, `status`, `paymentStatus` |
| Reviews | `/api/reviews` | `productId`, `userId`, `rating`, `isApproved` |
| Users | `/api/users` | `q`, `role`, `isActive` |

List endpoints accept `page` and `limit`; `limit` is capped at 100. API errors
use a consistent JSON structure, and unknown schema fields are rejected.

## Main structure

```text
garzon-server/
|-- config/          # Environment validation and MongoDB connection
|-- controllers/     # CRUD behavior and collection-specific filtering
|-- middleware/      # ObjectId, 404, and error handling
|-- models/          # Six Mongoose schemas, validation, and indexes
|-- routes/          # Express routers for every collection
|-- scripts/         # Safe sample seed and validation demonstrations
|-- utils/           # Typed controller/error/query helpers
`-- index.js         # Express setup, routes, database startup, and HTTP server
```
