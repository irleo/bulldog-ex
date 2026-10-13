# CTWEBPGL Web Programming - Long Exam 1

For production hosting, follow the [Vercel deployment guide](DEPLOYMENT.md).

This repository contains **BulldogEx Shop**, a full-stack campus e-commerce application. The React client presents the public catalog, customer ordering flow, authentication pages, and administrator console. The Express server exposes a REST API backed by MongoDB and enforces validation, authentication, authorization, and data ownership.

## Deployment and Demo Accounts

Deployment branch: `deployment`.

Live site: [BulldogEx Shop](https://bulldogex-client.vercel.app).

Use these accounts to review the application's admin and customer workflows:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `garzonlm@admin.com` | `@Password1` |
| Customer | `garzonlm@customer.com` | `@Password1` |

## Main Features

- JWT registration, login, logout, protected routes, and active-session checks
- Customer product search/category filtering, cart, pickup orders, reviews, and profile management
- Admin product, order, review, and user-management console
- Backend-enforced role and ownership authorization
- Pickup order progression from pending through ready for claiming
- Consistent validation and API error responses

## Client-Server Integration

The project is split into two independently installed and executed Node.js packages:

- `garzon-client` runs the browser application with Vite, normally at `http://localhost:5173`.
- `garzon-server` runs the REST API, normally at `http://localhost:5000/api/v1`.
- MongoDB is accessed only by the server. The client never connects directly to the database.

The client reads `VITE_API_URL` from `garzon-client/.env`. Its centralized `apiRequest()` function in `src/api/apiClient.js` uses the browser Fetch API to send requests to the configured server URL. JSON request bodies automatically receive a `Content-Type: application/json` header, while `FormData` requests allow the browser to set the multipart boundary used for product image uploads.

After a successful login, the client stores the returned JWT in `sessionStorage`, or in `localStorage` when the user selects the remember option. Future protected requests include the token as `Authorization: Bearer <token>`. `AuthProvider` restores the session through `GET /users/me/session`, and client route guards control the user experience for authenticated and role-specific pages. These route guards are not the security boundary: the server independently verifies the JWT, reloads the user, checks whether the account is active, and enforces customer/admin permissions.

On the server, `CLIENT_ORIGIN` configures CORS so the browser may call the API. Requests pass through Express middleware and the matching `/api/v1` router before reaching a controller. Controllers validate and normalize input, execute Mongoose operations, and return a consistent JSON shape containing fields such as `success`, `message`, `count`, `data`, and, where applicable, `pagination` or `error`. Uploaded product images are served from `/uploads`, and the client can use those server-relative paths when displaying products.

```text
React page/component
        |
        | apiRequest() / Fetch + optional Bearer JWT
        v
Express /api/v1 route
        |
        | authentication, authorization, validation, upload middleware
        v
Controller -> Mongoose model -> MongoDB
        |
        v
Structured JSON response -> React state -> rendered UI
```

## Client Libraries and Packages

The following packages belong specifically to `garzon-client/package.json`:

| Package | Use in the client |
| --- | --- |
| `react` | Builds pages and reusable UI components using state, effects, context, and composition. |
| `react-dom` | Mounts the React component tree into the browser DOM. |
| `react-router-dom` | Defines nested layouts, public routes, protected routes, URL parameters, redirects, and role-based navigation. |
| `sonner` | Displays application toast notifications and API success/error feedback. |
| `tailwindcss` | Provides utility-first styling used throughout the interface. |
| `@tailwindcss/vite` | Integrates Tailwind CSS processing into Vite. |
| `vite` | Supplies the development server, hot module replacement, and production bundling. |
| `@vitejs/plugin-react` | Enables React JSX transformation and Fast Refresh in Vite. |
| `eslint`, `@eslint/js` | Performs static analysis and enforces JavaScript code-quality rules. |
| `eslint-plugin-react-hooks` | Checks correct React Hook usage and dependencies. |
| `eslint-plugin-react-refresh` | Checks component exports for reliable Fast Refresh behavior. |
| `globals` | Provides browser/global definitions to the ESLint configuration. |
| `@types/react`, `@types/react-dom` | Supplies editor and tooling type information for the React APIs used by JSX. |

The client uses the native browser Fetch API for HTTP communication, so a separate HTTP library such as Axios is not required.

## Server Libraries and Packages

The following packages belong specifically to `garzon-server/package.json`:

| Package | Use in the server |
| --- | --- |
| `express` | Creates the HTTP server, REST endpoints, middleware pipeline, and static upload route. |
| `mongoose` | Connects to MongoDB and defines schemas, validation rules, indexes, references, and database queries. |
| `jsonwebtoken` | Signs JWT access tokens and verifies bearer tokens for protected requests. |
| `bcryptjs` | Hashes account passwords and compares login credentials securely. |
| `cors` | Allows requests from the configured client origin and declares accepted headers/methods. |
| `dotenv` | Loads server configuration such as the port, database URI, client origin, and JWT settings from `.env`. |
| `morgan` | Logs incoming HTTP requests in development and production-appropriate formats. |
| `multer` | Parses multipart form data and validates/stores uploaded product images. |
| `helmet` | Adds HTTP security headers while allowing cross-origin product images. |
| `express-rate-limit` | Applies API, mutation, login, registration, and password-change request limits. |

The server targets Node.js 20 or later and uses Node's built-in watch mode for development, so it does not require Nodemon.

## Design Patterns

### Client Design Pattern

The client follows a **component-based, layered frontend architecture**:

- **Pages** represent route-level screens and coordinate data fetching and user actions.
- **Components** contain reusable presentation and interaction elements such as navigation, the footer, and shared store UI.
- **Layouts** use React Router's nested outlet pattern to share shells across public, authentication, and admin pages.
- **Context/Provider** centralizes global authentication state. `AuthProvider` supplies the current user and session actions without prop drilling.
- **Route guards** wrap protected route branches and apply authentication or role requirements before rendering their child routes.
- **API service layer** centralizes the base URL, token attachment, body headers, response parsing, and error normalization in `apiClient.js`.
- **Utility modules** isolate cross-cutting UI behavior such as toast notifications.

This separation keeps transport and session logic out of most visual components while allowing pages to focus on screen-specific state and behavior.

### Server Design Pattern

The server uses an **MVC-inspired layered architecture** with an Express middleware pipeline:

- **Routes** define HTTP methods and URLs, then compose the middleware and controller required for each endpoint.
- **Middleware** handles cross-cutting concerns such as JWT authentication, role authorization, ObjectId validation, file uploads, 404 handling, and structured errors.
- **Controllers** implement use-case and request-handling logic, whitelist accepted fields, call the data layer, and serialize HTTP responses.
- **Models** act as the data layer by defining Mongoose schemas, validation, relationships, hooks, collection names, and indexes.
- **Configuration modules** centralize environment parsing, database connection setup, roles, order states, and HTTP status constants.
- **Utility modules** provide focused reusable functions for tokens, query parsing, field selection, and slug creation.

Controllers are wrapped by `asyncHandler`, which forwards rejected promises into a centralized error handler. This keeps error responses consistent and prevents route handlers from duplicating `try/catch` response logic. Authentication and role checks are composed before protected controllers, following the middleware/chain-of-responsibility pattern.

## API Route Groups

- `/api/v1/users` - registration, login, logout, session lookup, profiles, and user management
- `/api/v1/categories` - catalog categories
- `/api/v1/products` - public catalog and admin product management
- `/api/v1/carts` - authenticated customer cart operations
- `/api/v1/orders` - customer checkout/history and admin order processing
- `/api/v1/reviews` - product reviews and admin moderation
- `/api/v1/health` - API health check

## Fork and Clone Instructions

Fork the original repository on GitHub, then clone the fork:

```bash
git clone <forked-repository-url>
cd surname-long-exam
```

## Project Setup

The client and server have separate dependencies and must be installed independently.

### 1. Configure and run the server

Create `garzon-server/.env` without committing it:

```dotenv
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/bulldogs_exchange
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=8h
```

Then install and start the server:

```bash
cd garzon-server
npm install
npm run dev
```

Verify the server at `http://localhost:5000/api/v1/health`.

### 2. Configure and run the client

In a second terminal, create `garzon-client/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api/v1
```

Then install and start the client:

```bash
cd garzon-client
npm install
npm run dev
```

Open `http://localhost:5173`. The URL and port must match the server's `CLIENT_ORIGIN` value. If either application is deployed elsewhere, update both environment variables accordingly.

### Other Commands

Run these commands from `garzon-client`:

```bash
npm run build
npm run lint
npm run preview
```

## Client Routes

- `/` - home page
- `/about` - store information
- `/products` - searchable product catalog
- `/products/:id` - product details and reviews
- `/auth/signin` - sign-in page
- `/auth/signup` - registration page
- `/profile` - authenticated profile and password management
- `/cart` - customer cart
- `/orders` - customer order tracking
- `/admin` - admin dashboard
- `/admin/products` - admin product management
- `/admin/orders` - admin order processing
- `/admin/reviews` - admin review moderation
- `/admin/users` - admin account management

## Project File Outline

Generated folders such as `node_modules` and `dist`, local environment files, and individual image assets are omitted for clarity.

```text
garzon-webprog-longexam/
|-- README.md                         # Full-project documentation
|-- .gitignore
|-- garzon-client/                    # Browser presentation application
|   |-- package.json                  # Client dependencies and scripts
|   |-- vite.config.js                # React and Tailwind Vite plugins
|   |-- index.html                    # Browser entry document
|   |-- public/
|   |   |-- products/                 # Static catalog images
|   |   |-- favicon.svg
|   |   `-- icons.svg
|   `-- src/
|       |-- main.jsx                  # React root and AuthProvider setup
|       |-- App.jsx                   # Route tree and Toaster setup
|       |-- api/
|       |   `-- apiClient.js          # Central Fetch/JWT service layer
|       |-- auth/
|       |   |-- AuthProvider.jsx      # Global authentication state/actions
|       |   |-- authContext.js        # Context and useAuth access
|       |   `-- RouteGuards.jsx       # Protected and role-based outlets
|       |-- components/               # Reusable presentation components
|       |   |-- Footer.jsx
|       |   |-- NavBar.jsx
|       |   `-- StoreUI.jsx
|       |-- layouts/                  # Shared route shells
|       |   |-- Layout.jsx
|       |   |-- AuthLayout.jsx
|       |   `-- AdminLayout.jsx
|       |-- pages/                    # Route-level screens
|       |   |-- LandingPages/         # Home, about, catalog, product detail
|       |   |-- AuthPages/            # Sign-in and sign-up
|       |   |-- Customer/             # Cart, orders, and profile
|       |   |-- Admin/                # Dashboard and management console
|       |   `-- NotFoundPage.jsx
|       |-- assets/                   # Images and global CSS
|       `-- utils/
|           |-- toast.js              # Shared notification helpers
|           `-- validation.js         # Client input validation
`-- garzon-server/                    # REST API and persistence application
    |-- package.json                  # Server dependencies and scripts
    |-- index.js                      # Database/index readiness and HTTP startup
    |-- app.js                        # Express middleware and route composition
    |-- config/
    |   |-- config.js                 # Validated environment configuration
    |   |-- constants.js              # Status, role, and order constants
    |   `-- db.js                     # MongoDB connection
    |-- routes/                       # Endpoint and middleware composition
    |   |-- cartRoutes.js
    |   |-- categoryRoutes.js
    |   |-- orderRoutes.js
    |   |-- productRoutes.js
    |   |-- reviewRoutes.js
    |   `-- userRoutes.js
    |-- controllers/                  # Request/use-case handlers
    |   |-- cartController.js
    |   |-- categoryController.js
    |   |-- orderController.js
    |   |-- productController.js
    |   |-- reviewController.js
    |   `-- userController.js
    |-- middleware/                   # Authentication, authorization, validation, and errors
    |   |-- auditLoggerMiddleware.js   # Persistent request/response audit records
    |   |-- rateLimiterMiddleware.js   # IP quotas and account login cooldowns
    |   |-- authentication.js
    |   |-- authorization.js
    |   |-- errorHandlers.js
    |   |-- validationMiddleware.js    # API request validation before controllers
    |   `-- validateObjectId.js
    |-- models/                       # Mongoose data models and indexes
    |   |-- logModel.js                # Completed request audit records
    |   |-- cartModel.js
    |   |-- categoryModel.js
    |   |-- orderModel.js
    |   |-- productModel.js
    |   |-- reviewModel.js
    |   `-- userModel.js
    |-- utils/                        # Query, token, slug, and field helpers
    |   |-- query.js
    |   |-- selectFields.js
    |   |-- slugify.js
    |   |-- token.js
    |   `-- validation.js             # Authoritative API input validation
    `-- uploads/                      # Server-managed product images
```
