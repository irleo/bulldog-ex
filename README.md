# CTWEBPGL Web Programming - Long Exam 1

This repository contains the Bulldogs Exchange React frontend and its Express/MongoDB backend.

The current project is **BulldogEx Shop**, a low-fidelity e-commerce wireframe for campus products. It includes a full-width hero banner, product catalog cards, product detail pages, store information pages, shared layouts, and authentication screens.

## Tech Stack

- React 19
- Vite
- React Router DOM
- Tailwind CSS 4
- ESLint
- Express
- MongoDB with Mongoose

## Main Features

- JWT registration, login, logout, protected routes, and active-session checks
- Customer product search/category filtering, cart, pickup orders, reviews, and profile management
- Admin product, order, review, and user-management console
- Backend-enforced role and ownership authorization
- Pickup order progression from pending through ready for claiming
- Consistent validation and API error responses

## Fork and Clone Instructions

Fork the original repository first on GitHub. This creates your own copy of the repository under your GitHub account.

After the repository is forked, clone your forked repository to your local device:

1. Go to the root folder where you want to save the project.
2. Open that folder in **VS Code**.
3. Open the **VS Code Terminal**.
4. Run `git clone` using the URL of your forked repository:

```bash
git clone <forked-repository-url>
```

Example:

```bash
git clone https://github.com/your-username/surname-long-exam.git
```

After cloning the forked repository, go inside the cloned project folder:

```bash
cd surname-long-exam
```

## Project Setup

Install frontend dependencies:

```bash
cd garzon-client
npm install
```

Start the frontend development server:

```bash
npm run dev
```

In a second terminal, install and start the backend after copying
`garzon-server/.env.example` to `garzon-server/.env`:

```bash
cd garzon-server
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

## Push to GitHub Using Git Bash

Open **Git Bash** or **VS Code Terminal**, then go to the project root folder:

Example
```bash
cd /c/Users/ACER/Desktop/cy.dev/cy.dev.reactjs/course-material/webprog/long-exam1
```

Check the files before committing:

```bash
git status
```

If this folder is not yet a Git repository, initialize it:

```bash
git init
```

Stage, commit, and push the project:

```bash
git add .
git commit -m "initial long-exam1"
git push origin main
```

For future updates after editing files:

```bash
git status
git add .
git commit -m "enhanced long-exam1"
git push
```

## Current Routes

- `/` - Home page
- `/about` - About page
- `/products` - Product list page
- `/products/:id` - API-driven product detail and reviews
- `/auth/signin` - Sign in page
- `/auth/signup` - Sign up page
- `/profile` - Authenticated profile and password management
- `/cart` - Customer cart
- `/orders` - Customer order tracking
- `/admin/products` - Admin product management
- `/admin/orders` - Admin order processing
- `/admin/reviews` - Admin review moderation
- `/admin/users` - Admin account management

## Key Files

- `src/api/apiClient.js` - authenticated backend API client
- `src/auth/` - session context and route guards
- `src/components/ProductCard.jsx` - reusable product card component
- `src/components/ProductList.jsx` - product grid component
- `src/pages/LandingPages/ProductListPage.jsx` - product catalog page
- `src/pages/LandingPages/ProductPage.jsx` - single product detail page
- `src/pages/LandingPages/HomePage.jsx` - landing page with full-width hero banner
- `garzon-server/models/` - Mongoose collection definitions and indexes
- `garzon-server/controllers/` - API request handlers
- `garzon-server/routes/` - Express collection routes
- `docs/activity2-database-design.md` - activity tables, CRD, and screenshot checklist

## Current File Structure

```text
long-exam1/
├── README.md
├── garzon-client/
    ├── .gitignore
    ├── eslint.config.js
    ├── index.html
    ├── package-lock.json
    ├── package.json
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── assets/
        │   ├── hero.png
        │   ├── product-content.js
        │   ├── react.svg
        │   ├── vite.svg
        │   ├── img/
        │   │   ├── nu_bulldogex_banner.jpg
        │   │   └── nubdexchange_logo.png
        │   └── styles/
        │       └── index.css
        ├── components/
        │   ├── Button.jsx
        │   ├── Footer.jsx
        │   ├── NavBar.jsx
        │   ├── ProductCard.jsx
        │   └── ProductList.jsx
        ├── layouts/
        │   ├── AuthLayout.jsx
        │   └── Layout.jsx
        └── pages/
            ├── NotFoundPage.jsx
            ├── AuthPages/
            │   ├── SignInPage.jsx
            │   └── SignUpPage.jsx
            └── LandingPages/
                ├── AboutPage.jsx
                ├── ProductListPage.jsx
                ├── ProductPage.jsx
            └── HomePage.jsx
└── garzon-server/
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── models/
    ├── routes/
    ├── scripts/
    └── index.js
```

## Notes

- `node_modules/` and `dist/` are not included in the structure above because they are generated folders.
- The application uses `Layout.jsx` for public pages and `AuthLayout.jsx` for authentication pages.
- Product and category data are loaded from the backend rather than mock content.
- Public registration always creates a customer. Create the first admin with the backend `npm run create:admin` command after configuring its environment variables.

## Enhancement Instructions
- Enhancement 1: Develop an original product catalog with appropriate product names, descriptions, prices, categories, and images.
- Enhancement 2: Create a customized footer and notfoundpage that aligns with the website theme and ensure that all links function correctly.
- Enhancement 3: Provide accessible navigation links for both Sign In and Sign Up pages.
- Enhancement 4: Improve the overall visual design through consistent colors, typography, spacing, and imagery without changing the existing component order or page structure.
- Enhancement 5: Research and apply a custom font to the web application using an appropriate implementation method.
