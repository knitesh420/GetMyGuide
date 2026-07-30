# Tour — Frontend

> Web client for **Tour**, a tour and travel booking platform that connects tourists with local guides.

Built with **Next.js** and **TypeScript**, this application delivers the public marketing site, tourist and guide dashboards, booking checkout, and admin console. It consumes the [Tour backend API](../backend).

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

The Tour frontend is the customer- and guide-facing web application for the Tour platform. It is built on the Next.js App Router and provides the public marketing site, authentication flows, tourist and guide dashboards, booking/checkout, and an internal admin console. All data is served by the [Tour backend API](../backend).

## Key Features

- **Public Marketing Site** — Home, tours, guides, blog, services, about, and contact pages.
- **Guide Discovery & Booking** — Find-guide search, guide availability, and a full booking checkout flow with Razorpay payments.
- **Authentication** — Login and registration flows for both tourists and guides.
- **Dashboards** — Authenticated tourist and guide dashboard views.
- **Admin Console** — Internal tooling for managing platform content and operations.
- **Content & Legal Pages** — Blog, privacy policy, terms and conditions, refund and cancellation, and safety guidelines.
- **Rich Text Editing** — Tiptap-powered editor for content authoring (e.g. blog posts).
- **Responsive, Accessible UI** — Built on Radix UI primitives and Tailwind CSS.

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI Library | React 18 |
| Styling | Tailwind CSS 4, Radix UI primitives, `shadcn/ui`-style components |
| State Management | Redux Toolkit, React Redux |
| Forms & Validation | React Hook Form, Zod |
| HTTP Client | Axios |
| Rich Text Editor | Tiptap |
| Animation | Framer Motion |
| Charts | Recharts |
| Notifications | Sonner, React Toastify |
| Analytics | Vercel Analytics |

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** 18 or later
- **pnpm** (the repository includes a `pnpm-lock.yaml`)
- The [Tour backend API](../backend) running locally or a reachable deployment

## Installation

Clone the repository, install dependencies, configure your environment, and start the development server:

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

> **Note:** Update the values in `.env` as described in [Environment Variables](#environment-variables) before starting the server.

## Environment Variables

Copy `.env.example` to `.env` and configure the following keys:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API (e.g. `http://localhost:8000`) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay **public** key ID used for checkout |

> ⚠️ Only the Razorpay **public** key belongs in this file. Never expose the Razorpay secret key in frontend code or environment variables.

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Lint the codebase with Next.js/ESLint |

## Project Structure

```text
frontend/
├─ app/
│  ├─ (website)/         # Public site: home, tours, guides, blog, checkout, dashboard, etc.
│  ├─ (auth)/             # Login and authentication flows
│  ├─ admin/              # Admin console
│  └─ location/           # Location-related pages
├─ components/            # Shared, reusable UI components
├─ contexts/               # React context providers
├─ hooks/                  # Custom React hooks
├─ lib/                    # Shared utilities and helpers
├─ service/                # API client / service layer (Axios)
├─ styles/                 # Global styles
└─ types/                  # Shared TypeScript type definitions
```

## Development Workflow

1. Create a feature branch from `main`.
2. Run `pnpm dev` to start the development server with hot reload.
3. Follow existing component and styling conventions (Radix UI + Tailwind CSS).
4. Run `pnpm lint` before committing.
5. Run `pnpm build` locally to confirm the production build succeeds.
6. Open a pull request describing the change and its motivation.

## Deployment Notes

The application is a standard Next.js build and can be deployed to any Node.js-compatible host or platform (e.g. Vercel):

```bash
pnpm install
pnpm run build
pm2 restart <process-name>
```

> Ensure `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_RAZORPAY_KEY_ID` are set correctly for the target environment before building, since `NEXT_PUBLIC_*` variables are baked into the build at compile time.

## Security Notes

- **Never commit `.env` files or secrets** to the repository. `.env` is already excluded via `.gitignore` (with `.env.example` intentionally tracked).
- Only expose **public** keys via `NEXT_PUBLIC_*` variables — anything prefixed this way is bundled into client-side JavaScript and is publicly visible.
- Keep dependencies up to date and monitor for known vulnerabilities (e.g. via `pnpm audit`).

## Related Projects

- **Backend API:** [`../backend`](../backend) — Express, TypeScript, and MongoDB service providing authentication, bookings, payments, and content management.

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository and create a feature branch.
2. Follow the existing code style and component conventions.
3. Verify `pnpm lint` and `pnpm build` pass before opening a pull request.
4. Describe the change and its motivation clearly in the pull request.

> A formal `CONTRIBUTING.md` may be added as the project matures.

## License

This project does not currently specify an open-source license. All rights reserved unless a `LICENSE` file is added to the repository.
