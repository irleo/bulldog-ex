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
| Products | List active, in-stock products | List active, in-stock products | View all stock levels; create, edit, activate/deactivate |
| Reviews | View visible reviews | Create reviews after claiming an order | View, edit content/rating, flag, and hide reviews |
| Cart | - | Manage own cart | - |
| Orders | - | Create and view own orders | View all and update status |
| Profile | - | View/edit own profile and password | View/edit own profile and password |
| Users | - | View/edit own record | View, edit, activate/deactivate, delete |

Every protected request sends `Authorization: Bearer <token>`. Authentication
also checks the database on every request, so deactivated accounts immediately
lose access even when they still hold an unexpired token.

The customer product list excludes products with zero stock. Search results and
pagination totals use the same in-stock filter. Admin inventory continues to
include sold-out products for restocking. Active products return to the customer
list on its next refresh once their stock is greater than zero.

## Primary endpoints

- `/api/v1/users/register`, `/login`, `/logout`, `/me/session`
- `/api/v1/products` and admin `/api/v1/products/admin`
- `/api/v1/categories`
- `/api/v1/carts`
- `/api/v1/orders` and customer `/api/v1/orders/mine`
- `/api/v1/reviews` and admin `/api/v1/reviews/admin`
- `/api/v1/users/me`, `/api/v1/users/:id`, and admin `/api/v1/users`

## Input validation

New customer registrations require `firstName`, `lastName`, `studentNumber`,
`course`, `yearLevel`, `email`, and `password`. NU Manila student numbers use
`####-######` (for example, `2023-123456`) and are stored as strings to preserve
leading zeros. Course accepts 2–120 characters and year level accepts 1–30
characters. The existing password minimum remains 8 characters.

Student details are returned with session/profile/user responses and can be
edited through profiles and admin user management. Existing accounts without
these fields remain usable; details are filled in through normal edits rather
than a bulk migration. New admin records do not require student details.

Example registration body for Postman:

```json
{
  "firstName": "Activity",
  "lastName": "Tester",
  "studentNumber": "2023-123456",
  "course": "BSIT",
  "yearLevel": "4th Year",
  "email": "activity5.tester@example.com",
  "password": "Activity5Test!"
}
```

Each resource router imports `middleware/validationMiddleware.js`. User login
and registration apply their IP limiter before validation; protected user
routes additionally enforce authentication and authorization.

The server owns `utils/validation.js`, used by Express validation middleware,
controllers, and upload processing. The client owns a separate
`garzon-client/src/utils/validation.js` for immediate feedback. Keep their field
rules aligned when changing validation; the server remains authoritative.
Neither app imports validation from outside its directory.
JSON fields keep strict types; multipart numeric/boolean fields are
parsed explicitly. Unknown body fields, MongoDB operator keys, malformed IDs,
control characters, and invalid values return safe field-level errors.

- Names allow Unicode letters, spaces, apostrophes, periods, and hyphens.
- Passwords are never trimmed; new passwords require at least 8 characters and
  at most 72 UTF-8 bytes to avoid bcrypt truncation.
- Prices are 0–1,000,000 with at most two decimal places; stock is an integer
  from 0–1,000,000. These are application limits, not payment-provider limits.
- Quantities are 1–100 per product, with at most 100 distinct cart products.
- Search/filter strings are capped at 120 characters; page size is 1–100 and
  page is 1–100,000. Fractional or partially numeric pagination is rejected.
- Product creation and category changes require an existing active category.
- Review ratings are integers from 1–5 and review text is 10–1000 characters.
- An upload accepts one JPG/PNG/WebP up to 5 MB, checks extension, declared MIME,
  and file signature before writing a generated filename. Signature checks do
  not fully decode images or detect every corrupt/polyglot file. A failed later
  database write can still leave an unused uploaded file.
- Errors never return stack traces or submitted database values; the client
  translates network failures into a user-facing message.

Checkout continues using database prices and validates stored quantities and
profile details. Inventory is reserved on Admin confirmation, not pending-order
creation. Conditional stock updates prevent negative stock; pending orders do
not guarantee availability. The existing compensating updates are not a
multi-document transaction and do not provide crash-safe all-or-nothing checkout.

Validation does not change Admin/Customer authorization, review eligibility,
or the existing customer pickup-claim workflow. No database migration is needed;
legacy records are not rewritten automatically.

## Activity 5 security middleware

`index.js` connects to MongoDB and initializes the audit log model before
listening. `app.js` composes the Express application without starting a server,
so tests can exercise real HTTP middleware independently.

Middleware order is audit logger → Helmet → CORS → API/write limiters → body
parsers → resource routers and validation/authentication → centralized errors.
Audit logging observes completed responses, including parser failures, 404s,
authorization denials, and throttled requests. `auditLoggerMiddleware.js` writes
method, path without query parameters, IP, authenticated user ID, status,
severity, duration, and timestamps to `auditLogs`. Bodies, cookies, passwords,
and authorization headers are excluded. A logging failure is reported to the
server console without changing the response. Logs are retained until an
explicit retention policy is chosen.

Helmet explicitly configures the activity's CSP directives, including
`upgrade-insecure-requests`, `X-Frame-Options: SAMEORIGIN`, and the specified
referrer policy. Cross-origin resource loading remains enabled for product images.
CORS exposes
`Retry-After` and rate-limit headers to the configured frontend origin.

`rateLimiterMiddleware.js` applies these per-IP request limits:

| Scope | Limit | Window |
| --- | --- | --- |
| All API requests | 300 | 15 minutes |
| API mutations | 60 | 15 minutes |
| Login | 20 | 15 minutes |
| Registration | 5 | 1 hour |
| Password changes | 5 | 15 minutes |

These quotas include failed requests and return structured HTTP 429 responses.
Their in-memory counters reset when the server restarts and are suitable for
this single-process application. Multiple instances require a shared limiter
store. Configure proxy trust only for a known deployment topology.

Account-specific login protection uses `failedLoginAttempts`, `loginLockedUntil`,
and `loginFailuresExpireAt` on the existing User model. These fields are hidden
from normal queries and cannot be changed through profile or registration inputs.
Unknown email addresses remain protected by the per-IP login limiter.
Failed attempts 5–7 impose 3 minutes per failure, 8–9 impose 5 minutes, and 10+
impose 30 minutes. Requests during an active cooldown do not increase the count
or extend the deadline. Counts survive cooldown expiry and server restarts;
successful authentication resets them, and 24 hours without a counted failure
expires the history logically; the next failure starts a new count. Atomic
updates prevent concurrent failures from losing counts or extending an active
lock. Existing users without these fields are treated as having no failures;
the fields are initialized on their next login operation, without a bulk migration.
The sign-in screen displays a countdown from the server's retry duration.

Login-attempt database operations are defined in `models/userModel.js`
alongside the schema and are shared by the login controller and middleware.

## Activity submission evidence

For the activity submission, capture startup/MongoDB output, the three named
middleware files, valid and invalid User API requests, persisted audit entries,
Helmet response headers, CORS preflight, HTTP 429 with `Retry-After`, and each
failed-login cooldown tier. Attach screenshots and export the activity as PDF.
