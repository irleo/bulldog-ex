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
- Prices are 0.01–1,000,000 with at most two decimal places; stock is an integer
  from 0–1,000,000. These are application limits, not payment-provider limits.
- Quantities are 1–100 per product, with at most 100 distinct cart products.
- Search/filter strings are capped at 120 characters; page size is 1–100 and
  page is 1–100,000. Fractional or partially numeric pagination is rejected.
- Product creation and category changes require an existing active category.
- Review ratings are integers from 1–5 and review text is 10–1000 characters.
- An upload accepts one static JPG/PNG/WebP up to 5 MB and 20 megapixels. The
  middleware checks extension, MIME and signature, fully decodes the pixels,
  and re-encodes to WebP without source metadata before uploading to Cloudinary.
  Replaced Cloudinary assets are deleted after the database update succeeds.
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
server console without changing the response. New logs expire after 90 days. Outstanding writes are capped at 32, non-API
traffic is excluded, and repeated HTTP 429 responses are sampled once per minute.
Existing logs without an expiry require a separately approved retention backfill.

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
MongoDB-backed fixed-window counters are shared across server instances and
survive restarts. Expired windows have TTL cleanup. Set TRUST_PROXY only to the
exact trusted proxy IP addresses/subnets, comma-separated; default is no proxy trust.

Login protection stores HMAC-hashed email identifiers in `loginAttempts`, for both
known and unknown accounts. Missing accounts perform a dummy bcrypt comparison.
Failures 5–7 impose a 3-minute cooldown, 8–9 impose 5 minutes, and 10+ impose
30 minutes. Requests during a cooldown cannot extend it; the UI displays the
remaining time. Sign-in is available again after the deadline. A successful
sign-in resets the history; failure records expire after 24 hours. Counters and
cooldowns apply consistently without revealing whether an email is registered.

## Activity submission evidence

For the activity submission, capture startup/MongoDB output, the three named
middleware files, valid and invalid User API requests, persisted audit entries,
Helmet response headers, CORS preflight, HTTP 429 with `Retry-After`, and each
failed-login cooldown tier. Attach screenshots and export the activity as PDF.

## Activity 6 product images

Use Node.js 20.9 or newer. Install dependencies with `npm install` in this
directory. Set these values in the existing, ignored `garzon-server/.env`, then
restart the backend:

```dotenv
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Keep the API secret on the server and redact it from screenshots. Missing
credentials return HTTP 503 for uploads; product reads and edits without a new
image remain available. Assets use `bulldogs-exchange/products` in Cloudinary.
The integration uses the SDK's [buffer upload stream](https://cloudinary.com/documentation/node_image_and_video_upload#the_upload_stream_method)
and [Sharp's strict decoding limits](https://sharp.pixelplumbing.com/api-constructor/).

### API and admin form

All image writes require a Bearer token belonging to an active admin:

| Method and path | Multipart fields | Result |
| --- | --- | --- |
| `POST /api/v1/products` | Required product fields; optional `image` file | Creates a product, HTTP 201 |
| `PATCH /api/v1/products/:id` | Changed product fields and/or `image` file | Updates a product, HTTP 200 |
| `POST /api/v1/products/:id/upload-image` | One required `image` file only | Replaces the product image, HTTP 200 |

In Postman/Insomnia choose **Body → form-data**, set `image` to **File**, and
select a supported image. Let the client set the multipart Content-Type boundary.
Responses retain `{ success, message, count, data }`; the image URL is in
`data.images[0]`. Public IDs are server-managed and hidden from query responses.
Do not send `images` or `imagePublicId` as request fields.

The admin create/edit dialog shows the current image and a local preview of a
selected replacement. Unsupported/oversized files show an immediate error;
corrupt content is rejected by the server. Submit without a selected file to
keep the existing image. The storefront uses the saved URL through ProductImage.

### Compatibility and failure recovery

Existing `images: string[]` records remain valid with no migration. The optional
`imagePublicId` is added only when a Cloudinary image is saved. Existing local
files remain served at `/uploads`; they are retained because legacy records may
share a path. Uploading a new image replaces the product's image array with one
managed image, matching the existing single-file form.

An atomic comparison of the previous image state prevents competing replacements
from deleting each other's assets. A confirmed rejected database write cleans
up its new upload. An ambiguous database/network failure retains the asset and
logs its public ID for reconciliation; deleting it could break a committed write.
Cleanup intent is stored in `mediaCleanupJobs` before uploads and before replacing
or removing an image reference. Failed or ambiguous operations therefore remain
recoverable after restart. Successful immediate cleanup removes its job. The
admin dashboard shows due checks and offers a bounded retry (five candidates).
Checks start after a 24-hour grace period, retain referenced images, and defer
failed retries for an hour. No background worker runs. Keep the dashboard checks
in the store's operating routine; the application never deletes local legacy files.
Deactivating a product keeps its image for later reactivation.

### Verification and submission

Run `npm run test:images` for isolated tests with mocked Cloudinary/MongoDB. These
tests do not upload files or modify the real database. Run `npm run lint` and
`npm run build` in `garzon-client` for frontend checks.
After configuring credentials, `npm run verify:cloudinary` uploads a generated
16-pixel test image, verifies its delivery, and removes that test asset. This is
an explicit live service check; it does not modify MongoDB products.

For live evidence, verify creation, replacement, preservation without a file,
and the image-only endpoint. Confirm the saved URL in MongoDB, the image in the
storefront, and the asset in the Cloudinary directory. Check missing image,
unsupported extension/MIME, disguised or corrupt file, over-5-MB input, invalid
product ID, missing product, missing token, and customer-role denial. Replacement
should remove the previous managed Cloudinary asset.

Capture startup/MongoDB output, dependencies, config with secrets redacted,
middleware/model/controller/routes, API successes and errors, both form previews,
the storefront, and Cloudinary assets. Add these to the Activity 6 document and
export `Garzon_Activity6_CTADWEBL.pdf`.

## Audit fixes and deployment

- Checkout sends `{cartId, revision}` and a UUID `Idempotency-Key` header. The
  unique user/key index plus a MongoDB transaction makes retries safe. Cart edits
  compare revisions and retry conflicts. Inventory and order transitions commit
  together; stock remains reserved at admin confirmation.
- MongoDB must be a replica set or sharded cluster. The configured database was
  verified read-only as a replica set on 29 September 2026. No live records were
  changed. A read-only range check found zero products with invalid price/stock.
- Existing tokens require a new sign-in after this update. Sessions store only
  token hashes. Logout revokes one session; password changes, suspension and
  archival invalidate older tokens. Password changes sign the current user out.
- Category deletion deactivates the category and retains product references.
  User deletion archives the account and revokes access. Profile data, cart,
  review attribution, and order history are retained; the email remains reserved.
  This is archival, not a personal-data erasure workflow.
- Dashboard totals cover the full collections. Paid order metrics cover orders
  created in the previous seven days, exclude cancelled/unpaid records, and show
  real zeros. No payment-recording or payment-gateway feature was introduced.
- New indexes: sessions token hash/expiry, login attempt hash/expiry, request quota
  expiry, media cleanup ID/due date, audit expiry, and order user/checkout key.
  Deploy with these indexes initialized before accepting traffic. Existing carts
  without revision read as revision 0; their next edit sets the field. Existing
  orders without checkout keys are excluded from the new unique partial index.
  Do not run index rebuilds or data backfills against production without approval.
- Production secrets must be at least 32 characters and must not contain common
  placeholder words. Configure HTTPS, frontend CSP, and edge request limits on
  the actual hosting service. Browser token storage and customer pickup
  acknowledgement retain the current application contract.
- Queries reject offsets over 10,000; narrow filters before deeper pagination.
  Larger deployments should use cursor pagination and verify actual query plans.

Run `npm run test:audit` for an isolated temporary MongoDB replica set (first run
requires the official MongoDB binary download), `npm run test:images` for mocked
provider tests, and `npm run typecheck` in both apps. Type checking is incremental:
strict checked modules cover validation, numeric rules, controllers, media and
quota utilities, and selected middleware; it does not claim a full legacy JS
conversion. Frontend `npm run lint` and `npm run build` remain required checks.

## Activity-aligned code structure

Routes call controllers directly. Cart operations live in `controllers/cartController.js`,
checkout and inventory transactions in `controllers/orderController.js`, and dashboard
queries in `controllers/dashboardController.js`. There is no repository layer.

For Part 5, `controllers/productController.js` imports the configured Cloudinary
client from `config/cloudinary.js` and performs `cloudinary.uploader.upload_stream`
inside its upload helper. Product creation, replacement, and the `uploadProductImage`
endpoint use that helper. This is the in-memory equivalent of the activity's
`upload(req.file.path)` example: middleware validates and re-encodes the image before
passing its buffer to the controller. Environment values remain in `config/config.js`;
SDK configuration remains in `config/cloudinary.js`. Shared transaction handling lives
in `utils/transaction.js`. Durable image cleanup lives in `utils/mediaCleanup.js`,
and shared rate-limit storage lives in `utils/requestQuotaStore.js`. There is no
service layer; controllers and middleware import these reusable utilities directly.

## Migrated product images

The 10 existing product records now use verified Cloudinary URLs in the
`bulldogs-exchange/products` asset folder. The eight dedicated local product PNGs
were removed after delivery and database verification. The storefront no longer
selects product images by SKU/name or substitutes a local product photo; a failed
image displays "Image unavailable". The shared study-kit homepage graphic remains
for its homepage use; the product uses the uploaded Cloudinary copy.

`PRODUCT_IMAGE_MIGRATION.json` at the project root records the original image
references and verified replacement URLs. `utils/migrateProductImages.mjs` is the
explicit migration utility; it skips already migrated Cloudinary records. It was
run with the user's authorization and should not be run as part of server startup.
For activity evidence, open Cloudinary Media Library and select the
`bulldogs-exchange/products` folder.
