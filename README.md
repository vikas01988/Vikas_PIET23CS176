# AV Room

A production-minded equipment lending system for college AV rooms. The current build includes a responsive operations dashboard, availability search, booking queue, approval flow, return calculations, deposits, late fees, JWT authentication, role-aware API routes, MongoDB schemas, and a memory fallback for local UI development.

## Features

- Admin overview with inventory, circulation, pending request, and overdue KPIs
- Search and filter availability by equipment name, ID, and category
- Booking creation modal and request approval interaction
- Borrow/return API with delay-day, late-fee, damage-charge, and refund calculations
- Active-loan transfer flow that reassigns the borrower while preserving due date and availability
- Student/admin JWT authentication with bcrypt password hashing
- Mongoose collections for users, equipment, and bookings; extend with transactions, notifications, damage reports, and audit logs
- Security middleware: Helmet, CORS allow-list, JSON limits, rate limiting, centralized errors

## Stack

React 19 + Vite, Express 5, MongoDB/Mongoose, JWT, bcryptjs.

## Run locally

1. Install Node.js 20+.
2. Run `npm install` in the root and `npm install` in `server` and `client`.
3. Copy `server/.env.example` to `server/.env`.
4. Run `npm run dev` from the root. Client: `http://localhost:5173`; API: `http://localhost:4000`.

The API runs in memory mode when `MONGODB_URI` is omitted, which makes the core workflow available without infrastructure. Add MongoDB and run `npm run seed` from the root for persistence.

## Environment variables

`PORT`, `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_URL` are documented in `server/.env.example`.

## API and testing

See [API.md](API.md) and import [postman_collection.json](postman_collection.json) into Postman. Run `npm --prefix client run build` for the production frontend build.

## Deployment

Build the client with `npm --prefix client run build`, serve `client/dist` from a static host, and run the server on a managed Node service. Use a managed MongoDB URI, a generated JWT secret, HTTPS, and a restricted `CLIENT_URL`. Add a reverse proxy for `/api` in production.

## Documentation

- [REASONING.md](REASONING.md) records product and architecture decisions.
- [AI_LOGS.md](AI_LOGS.md) is append-only project context for future AI sessions.

## Future scope

Multi-college tenancy, email/in-app notifications, QR/RFID scanning, maintenance workflows, payment gateways, faculty and club reservations, analytics exports, and mobile clients.
