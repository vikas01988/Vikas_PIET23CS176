# AV Room API

Base URL: `http://localhost:4000/api`

## Auth

- `POST /auth/register` - `{ name, email, password, department, rollNumber }`
- `POST /auth/login` - `{ email, password }`

Send `Authorization: Bearer <token>` on protected routes.

## Equipment

- `GET /equipment?search=&category=` - active inventory, searchable by name or ID
- `POST /equipment` - admin creates inventory item

## Bookings

- `GET /bookings` - student bookings or all bookings for admin
- `POST /bookings` - `{ equipmentId, quantity, borrowDate, expectedReturnDate }`
- `PATCH /bookings/:id/approve` - admin approval
- `PATCH /bookings/:id/transfer` - admin-only transfer of an active loan to another borrower: `{ name, email, department, rollNumber, note }`; preserves the original due date and does not change equipment availability
- `PATCH /bookings/:id/return` - `{ actualReturnDate, damageCharges }`; returns delay days, late fee, and refund

## Health

- `GET /health` - service and persistence status
