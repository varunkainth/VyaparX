# VyaparX

> A modern, full-stack business management platform for small businesses in India. Manage inventory, billing, GST compliance, and financial operations from both web and mobile.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.2+-f9f1e1)](https://bun.sh/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791)](https://www.postgresql.org/)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Authentication & Authorization](#authentication--authorization)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Development Roadmap](#development-roadmap)

---

## Overview

**VyaparX** (व्यापारX) is a comprehensive business management solution designed specifically for Indian small businesses. It combines inventory management, GST-compliant invoicing, ledger tracking, and financial analytics in a single, unified platform.

### Key Highlights

- **GST-Compliant Invoicing**: Automatic CGST/SGST/IGST calculation based on state
- **Multi-Business Support**: Manage multiple businesses from a single account
- **Role-Based Access**: Owner, Admin, Staff, Accountant, and Viewer roles
- **Real-time Analytics**: Track sales, payments, and business performance
- **Offline-Ready**: Sync support for mobile operations
- **Mobile-First Design**: Optimized for both desktop and mobile usage

---

## Features

### Core Modules

| Module | Features |
|--------|----------|
| **Inventory** | Add/Edit/Delete items, SKU tracking, HSN codes, GST rates, low stock alerts, stock adjustments |
| **Invoicing** | Sales & Purchase invoices, Credit/Debit notes, Auto invoice numbering, PDF export, Multiple templates |
| **Parties** | Customer & Supplier management, GSTIN tracking, Opening balances, Transaction history |
| **Payments** | Payment recording, Invoice allocation, Bank reconciliation, UPI/Cash/Bank/Cheque support |
| **Ledger** | Party-wise ledger, Bank accounts, General ledger, Financial statements |
| **Reports** | Monthly sales, GST summary, Outstanding receivables/payables, Profit & Loss, Low stock alerts |
| **Analytics** | Real-time event tracking, Business activity feed, Rollup analytics, Dashboard overview |

### GST Logic

```
Seller State = Buyer State → CGST + SGST
Seller State ≠ Buyer State → IGST
```

- Automatic tax calculation based on party state codes
- Support for both inclusive and exclusive pricing modes
- GST return-ready reports

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | React framework with App Router |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | Component library |
| [Zustand](https://github.com/pmndrs/zustand) | State management |
| [TanStack Query](https://tanstack.com/query) | Server state management |
| [React Hook Form](https://react-hook-form.com/) | Form handling |
| [Zod](https://zod.dev/) | Schema validation |
| [Recharts](https://recharts.org/) | Data visualization |
| [Lucide React](https://lucide.dev/) | Icons |

### Backend

| Technology | Purpose |
|------------|---------|
| [Bun](https://bun.sh/) | JavaScript runtime & package manager |
| [Express](https://expressjs.com/) | Web framework |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [PostgreSQL](https://www.postgresql.org/) | Primary database |
| [node-postgres (pg)](https://node-postgres.com/) | Database driver |
| [JWT](https://jwt.io/) | Authentication tokens |
| [Zod](https://zod.dev/) | Request validation |
| [PDFKit](https://pdfkit.org/) | PDF generation |
| [Nodemailer](https://nodemailer.com/) | Email service |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| [Docker](https://www.docker.com/) | Containerization |
| [Docker Compose](https://docs.docker.com/compose/) | Local development |
| [Git](https://git-scm.com/) | Version control |

---

## Architecture

### Monorepo Structure

```
VyaparX/
├── frontend/          # Next.js 16 web application
├── server/            # Bun + Express API server
├── docker-compose.yml # Local development orchestration
└── README.md          # This file
```

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Web (Next.js)    │    Mobile (Future)    │    API Clients  │
└─────────┬───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│  • JWT Authentication  • Rate Limiting  • CORS  • Validation │
└─────────┬───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  Auth │ Business │ Inventory │ Invoices │ Payments │ Ledger │
└─────────┬───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
│  PostgreSQL  │  Repository Pattern  │  Migrations           │
└─────────────────────────────────────────────────────────────┘
```

### Authentication Flow

1. **Signup/Login** → JWT Access + Refresh tokens issued
2. **Business Selection** → Tokens scoped to specific business
3. **Role-Based Access** → Middleware enforces permissions
4. **Token Refresh** → Silent refresh using refresh token
5. **Logout** → Token revocation

### Database Architecture

- **Multi-tenant**: Business-scoped data isolation
- **Soft Deletes**: All entities support soft deletion
- **Audit Logging**: Change tracking for compliance
- **Idempotency**: Duplicate request prevention

---

## Project Structure

### Frontend (`/frontend`)

```
src/
├── app/                    # Next.js App Router
│   ├── (routes)/          # Page components
│   ├── api/               # API routes (if any)
│   └── layout.tsx         # Root layout with metadata
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components (sidebar, nav)
│   ├── auth/              # Authentication forms
│   ├── dashboard/         # Dashboard widgets
│   ├── inventory/         # Inventory management
│   ├── invoices/          # Invoice management
│   ├── parties/           # Party management
│   ├── payments/          # Payment handling
│   ├── ledger/            # Ledger views
│   └── reports/           # Report components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities (API client, helpers)
├── services/              # API service functions
├── store/                 # Zustand stores
├── types/                 # TypeScript types
└── validators/            # Zod schemas
```

### Backend (`/server`)

```
src/
├── config/                # Configuration (DB, email, OpenAPI)
├── constants/             # Error codes, constants
├── controller/            # Route controllers
├── middleware/            # Express middleware
│   ├── authenticate.ts    # JWT verification
│   ├── businessGuard.ts   # Business access control
│   ├── roleGuard.ts       # Role-based permissions
│   └── validate.ts        # Request validation
├── migration/             # Database migrations
├── repository/            # Data access layer
├── routes/                # API route definitions
├── services/              # Business logic
├── types/                 # TypeScript types
├── utils/                 # Utilities
└── validators/            # Zod validation schemas
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.2+ (or Node.js 20+)
- [PostgreSQL](https://www.postgresql.org/) 15+ (or Docker)
- Git

### Quick Start with Docker

```bash
# Clone the repository
git clone <your-repo-url>
cd VyaparX

# Create environment file
cp .env.docker.example .env

# Edit environment variables
nano .env  # or your preferred editor

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend bun run migrate

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:4000
# API Docs: http://localhost:4000/docs
```

### Local Development

#### Backend

```bash
cd server

# Install dependencies
bun install

# Create environment file
cp .env.example .env

# Edit database and other configurations
nano .env

# Run migrations
bun run migrate

# Start development server
bun run dev
```

#### Frontend

```bash
cd frontend

# Install dependencies
bun install

# Create environment file
cp .env.local.example .env.local

# Start development server
bun run dev
```

---

## API Documentation

### Base URLs

- **Local**: `http://localhost:4000`
- **OpenAPI Spec**: `GET /openapi.json`
- **Swagger UI**: `GET /docs`

### Authentication

All API routes (except signup/login) require JWT authentication:

```
Authorization: Bearer <access_token>
```

### Core Endpoints

#### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | User registration |
| POST | `/auth/login` | User login |
| POST | `/auth/refresh` | Token refresh |
| GET | `/auth/me` | Current user |
| POST | `/auth/switch-business` | Switch business context |
| POST | `/auth/logout` | Logout |

#### Businesses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/businesses` | List businesses |
| POST | `/api/v1/businesses` | Create business |
| GET | `/api/v1/businesses/:id` | Get business details |
| PATCH | `/api/v1/businesses/:id` | Update business |

#### Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/businesses/:id/inventory-items` | List items |
| POST | `/api/v1/businesses/:id/inventory-items` | Create item |
| GET | `/api/v1/businesses/:id/inventory-items/:itemId` | Get item |
| PATCH | `/api/v1/businesses/:id/inventory-items/:itemId` | Update item |
| POST | `/api/v1/businesses/:id/inventory-items/:itemId/adjust-stock` | Adjust stock |

#### Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/invoices/sales` | Create sales invoice |
| POST | `/api/v1/invoices/purchase` | Create purchase invoice |
| GET | `/api/v1/businesses/:id/invoices` | List invoices |
| GET | `/api/v1/businesses/:id/invoices/:invoiceId` | Get invoice |
| POST | `/api/v1/businesses/:id/invoices/:invoiceId/cancel` | Cancel invoice |

#### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payments` | Record payment |
| GET | `/api/v1/businesses/:id/payments` | List payments |
| POST | `/api/v1/businesses/:id/payments/:id/reconcile` | Reconcile payment |

#### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/businesses/:id/reports/monthly-sales` | Monthly sales |
| GET | `/api/v1/businesses/:id/reports/gst-summary` | GST summary |
| GET | `/api/v1/businesses/:id/reports/outstanding` | Outstanding |
| GET | `/api/v1/businesses/:id/reports/low-stock` | Low stock |

For complete API documentation, see:
- [`server/docs/API_Routes.md`](server/docs/API_Routes.md)
- [`server/docs/Frontend_API_Integration.md`](server/docs/Frontend_API_Integration.md)

---

## Database Schema

### Core Entities

| Entity | Description |
|--------|-------------|
| `users` | User accounts |
| `businesses` | Business profiles |
| `business_members` | User-business relationships & roles |
| `parties` | Customers & suppliers |
| `inventory_items` | Product catalog |
| `stock_movements` | Stock in/out tracking |
| `invoices` | Sales & purchase invoices |
| `invoice_items` | Line items for invoices |
| `payments` | Payment records |
| `payment_allocations` | Invoice-payment links |
| `ledger_entries` | Financial transactions |
| `bank_accounts` | Bank account tracking |

### Role Hierarchy

```
owner > admin > staff > accountant > viewer
```

See [`server/docs/VyaparX_Database_Schema_v1_2.docx`](server/docs/VyaparX_Database_Schema_v1_2.docx) for detailed schema.

---

## Authentication & Authorization

### JWT Tokens

- **Access Token**: Short-lived (15 mins), used for API calls
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

### Business Context

After login, users must select a business context. All subsequent API calls are scoped to that business:

```
POST /auth/switch-business
{
  "business_id": "uuid"
}
```

### Permission Matrix

| Feature | Owner | Admin | Staff | Accountant | Viewer |
|---------|-------|-------|-------|------------|--------|
| View Data | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create/Edit | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Business Settings | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Deployment

### Docker (Recommended)

```bash
# Production build
docker-compose -f docker-compose.yml up -d --build

# View logs
docker-compose logs -f

# Database migrations
docker-compose exec backend bun run migrate
```

### Hosting Options

| Platform | Best For | Cost |
|----------|----------|------|
| **Vercel + Railway** | Startups, quick deployment | $25-50/mo |
| **AWS** | Enterprise, full control | $50-200/mo |
| **DigitalOcean** | Growing apps, balanced | $12-48/mo |
| **Self-Hosted (VPS)** | Cost-conscious | $5-20/mo |

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for detailed deployment guides.

---

## Environment Variables

### Backend (`server/.env`)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vyaparx
DB_USER=postgres
DB_PASSWORD=secret

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=VyaparX

# App
PORT=4000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Development Roadmap

### Phase 1: Core Backend ✅
- [x] Authentication & Authorization
- [x] Business Management
- [x] Inventory Management
- [x] Invoice & GST Logic
- [x] Ledger & Payments

### Phase 2: Web Dashboard ✅
- [x] Responsive UI
- [x] Reports & Analytics
- [x] Export Functionality
- [x] Settings & Configuration

### Phase 3: Mobile App (Future)
- [ ] React Native/Expo app
- [ ] Offline sync
- [ ] Barcode scanning
- [ ] Thermal printing

### Phase 4: Advanced Features (Future)
- [ ] WhatsApp automation
- [ ] Advanced analytics
- [ ] Multi-currency support
- [ ] API webhooks

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

## Support

For support, email support@vyaparx.com or join our Slack channel.

---

**Built with ❤️ for Indian businesses**
