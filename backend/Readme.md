# Tour — Backend

> REST API server for **Tour**, a tour and travel booking platform that connects tourists with local guides.

Built with **Express**, **TypeScript**, and **MongoDB**, this service powers authentication, guide and package management, bookings, payments, content, and media for the [Tour frontend](../frontend).

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Environment Variables](#environment-variables)
7. [Available Scripts](#available-scripts)
8. [Project Structure](#project-structure)
9. [Development Workflow](#development-workflow)
10. [Deployment Notes](#deployment-notes)
11. [Security Notes](#security-notes)
12. [Related Projects](#related-projects)
13. [Contributing](#contributing)
14. [License](#license)

---

## Project Overview

The Tour backend is the API layer for the Tour platform. It exposes REST endpoints consumed by the [Next.js frontend](../frontend), handling everything from user authentication and guide onboarding to bookings, payments, and content management. The service is written entirely in TypeScript and uses MongoDB (via Mongoose) as its primary data store.

## Key Features

- **Authentication & Sessions** — JWT-based auth with Google OAuth support and dedicated session verification middleware.
- **Guide & Package Management** — Endpoints for managing tour guides, their availability, and bookable packages.
- **Bookings & Leads** — Booking lifecycle handling and lead capture for prospective customers.
- **Payments** — Razorpay integration for processing payments and generating guide payment links.
- **Content Management** — Blog and advertisement modules for platform content.
- **Media Uploads** — Cloudinary-backed image storage via Multer.
- **Transactional Email** — Email delivery through Resend.
- **API Hardening** — Rate limiting, idempotency handling, and request ID validation middleware.
- **Automated Testing** — Unit and integration test suites using Jest, Supertest, and an in-memory MongoDB instance.

## Tech Stack

| Category | Technology |
| --- | --- |
| Runtime | Node.js |
| Framework | Express 5 |
| Language | TypeScript |
| Database | MongoDB (Mongoose ODM) |
| Authentication | JWT (`jsonwebtoken`), `bcrypt`, Google OAuth (`google-auth-library`) |
| Payments | Razorpay |
| Media Storage | Cloudinary, Multer, `multer-storage-cloudinary` |
| Email | Resend |
| Testing | Jest, Supertest, `mongodb-memory-server` |
| Code Quality | ESLint, Prettier |
| Dev Tooling | `ts-node`, `tsc-alias`, `nodemon`, `tsconfig-paths` |

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** 18 or later
- **pnpm** (the repository includes a `pnpm-lock.yaml`)
- A **MongoDB** connection string (Atlas or self-hosted)

## Installation

Clone the repository, install dependencies, and start the development server:

```bash
pnpm install
pnpm dev
```

> **Note:** You must create a `.env` file before starting the server. See [Environment Variables](#environment-variables) for the required keys.

The API will be available at `http://localhost:<PORT>` once running.

## Environment Variables

Create a `.env` file in the `backend/` root with the following keys:

| Variable | Description |
| --- | --- |
| `NODE_ENV` | Runtime environment: `development`, `production`, or `test` |
| `PORT` | Port the server listens on |
| `OS` | OS flag used by platform-specific logic |
| `DATABASE_URL` | MongoDB connection string |
| `JWT_SECRET` | Secret key used to sign JSON Web Tokens |
| `JWT_EXPIRE` | JWT expiry duration |
| `RESEND_API_KEY` | API key for the Resend transactional email service |
| `RAZORPAY_API_KEY` | Razorpay key ID |
| `RAZORPAY_API_SECRET` | Razorpay key secret |
| `GUIDE_PAYMENT_LINK_BASE_URL` | Base URL used to construct guide payment links |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

> ⚠️ **Never commit `.env` to version control.** Double-check which database `DATABASE_URL` points to before running scripts, tests, or migrations — running against the wrong environment can cause irreversible data loss.

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the development server with `nodemon` (hot reload) |
| `pnpm build` | Type-check and compile TypeScript to `build/` |
| `pnpm start` | Build the project and run the compiled server |
| `pnpm test` | Run the full Jest test suite |
| `pnpm test:unit` | Run unit tests only |
| `pnpm test:integration` | Run integration tests only |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests and generate a coverage report |
| `pnpm lint` | Lint the codebase with ESLint |
| `pnpm lint:fix` | Lint and automatically fix issues |
| `pnpm format` | Format the codebase with Prettier |
| `pnpm format:check` | Check formatting without writing changes |
| `pnpm lint:format` | Run `lint:fix` followed by `format` |

## Project Structure

```text
backend/
├─ src/
│  ├─ server.ts          # Application entry point
│  ├─ server-config.ts   # Express app and middleware configuration
│  ├─ config/            # Cloudinary configuration and app constants
│  ├─ middleware/         # Session verification, rate limiting, idempotency, ID validation
│  ├─ modules/            # Feature modules: advertisement, blog, booking, guide, lead, package, payment, session, user
│  ├─ mongo/              # Mongoose models and schemas
│  ├─ provider/           # Third-party service integrations
│  ├─ services/           # Business logic layer
│  ├─ scripts/            # One-off operational scripts (e.g. uploading public images)
│  ├─ types/              # Shared TypeScript type definitions
│  └─ utils/              # Helper utilities
├─ tests/
│  ├─ unit/               # Unit tests
│  ├─ integration/        # Integration tests
│  ├─ helpers/            # Shared test helpers
│  └─ setup/              # Test environment setup
└─ static/                # Statically served files
```

## Development Workflow

1. Create a feature branch from `main`.
2. Run `pnpm dev` to start the server with hot reload.
3. Write or update tests alongside any functional changes.
4. Run `pnpm lint` and `pnpm format:check` before committing.
5. Run `pnpm test` (or `pnpm test:unit` / `pnpm test:integration`) to verify behavior.
6. Open a pull request describing the change and its motivation.

> **Tip:** Use `pnpm test:coverage` periodically to identify undertested areas of the codebase.

## Deployment Notes

The backend is designed to run as a long-lived Node.js process:

1. Install dependencies: `pnpm install`
2. Build the project: `pnpm build`
3. Start (or restart) the compiled server under a process manager such as **PM2**

```bash
pnpm install
pnpm run build
pm2 restart <process-name>
```

> Ensure all required [environment variables](#environment-variables) are configured on the target host before deploying, and that `DATABASE_URL` points to the intended (production or staging) database.

## Security Notes

- **Never commit `.env` files, API keys, or secrets** to the repository. `.env` is already excluded via `.gitignore`.
- Rotate `JWT_SECRET`, Razorpay, Cloudinary, and Resend credentials immediately if they are ever exposed.
- Verify `DATABASE_URL` before running destructive scripts, seeders, or tests — accidental writes to a production database can be difficult or impossible to reverse.
- Keep dependencies up to date and monitor for known vulnerabilities (e.g. via `pnpm audit`).

## Related Projects

- **Frontend:** [`../frontend`](../frontend) — the Next.js application that consumes this API.

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository and create a feature branch.
2. Follow the existing code style (enforced via ESLint and Prettier).
3. Include or update tests for any behavioral changes.
4. Open a pull request with a clear description of the change and its motivation.

> A formal `CONTRIBUTING.md` may be added as the project matures.

## License

This project does not currently specify an open-source license. All rights reserved unless a `LICENSE` file is added to the repository.
