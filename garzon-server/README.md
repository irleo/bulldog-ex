# Bulldogs Exchange API

Express and MongoDB API for the Bulldogs Exchange store. Authentication uses
hashed passwords and signed JWT access tokens. Authorization is enforced by the
server; frontend route guards are not treated as a security boundary.

## Setup

1. Copy `.env.example` to `.env` and replace `JWT_SECRET`.
2. Configure `MONGO_URI` for local MongoDB or MongoDB Atlas.
3. Install dependencies with `npm install`.
4. Start the API with `npm run dev`.
5. Verify `GET http://localhost:5000/api/v1/health`.

Public registration creates customer accounts only. Administrator accounts are
not created by public registration or by the catalog seed.

Run `npm run seed` to upsert the categories and eight products represented by
the local assets in `garzon-client/public/products`. The command does not create,
update, or remove accounts, carts, orders, or reviews.

## Access model

| Resource | Public | Customer | Admin |
| --- | --- | --- | --- |
| Products | Search and view active products | Search and view | Create, edit, activate/deactivate |
| Reviews | View visible reviews | Create reviews after claiming an order | View, flag, and hide reviews |
| Cart | - | Manage own cart | - |
| Orders | - | Create and view own orders | View all and update status |
| Profile | - | View/edit own profile and password | View/edit own profile and password |
| Users | - | View/edit own record | View, edit, activate/deactivate, delete |

Every protected request sends `Authorization: Bearer <token>`. Authentication
also checks the database on every request, so deactivated accounts immediately
lose access even when they still hold an unexpired token.

## Primary endpoints

- `/api/v1/users/register`, `/login`, `/logout`, `/me/session`
- `/api/v1/products` and admin `/api/v1/products/admin`
- `/api/v1/categories`
- `/api/v1/carts`
- `/api/v1/orders` and customer `/api/v1/orders/mine`
- `/api/v1/reviews` and admin `/api/v1/reviews/admin`
- `/api/v1/users/me`, `/api/v1/users/:id`, and admin `/api/v1/users`
