# Reasoning

## Problem analysis

The paper register fails at the shared state problems: availability, accountability, returns, and deposits. The first release therefore emphasizes a fast admin review loop and reliable availability primitives.

## Architecture

The React client is a separate deployable surface from the Express API. The API exposes resource-oriented routes and keeps domain calculations at the booking boundary. MongoDB is the persistence target; memory mode allows demos and frontend development without infrastructure.

## Availability and booking logic

A request can only reference active equipment and a positive quantity. The production version should reserve quantities inside a transaction and query overlapping bookings using `borrowDate < requestedEnd` and `expectedReturnDate > requestedStart`. The equipment compound index supports that lookup. A booking is not treated as borrowed until issue is explicitly recorded.

## Return and deposits

At return, delay is `max(0, ceil(actualReturn - expectedReturn))`. Late fee is `delayDays * lateFeePerDay`. Refund is `max(0, depositPaid - lateFee - damageCharges)`. These values are stored with the booking to preserve an audit-friendly financial snapshot.

## Loan transfer

An admin can transfer only an active loan (`approved`, `borrowed`, or `overdue`) to another borrower. Transfer updates the booking's borrower reference and appends transfer history, but it deliberately leaves `expectedReturnDate`, quantity, reservation state, and equipment availability unchanged.

## Security

Passwords are bcrypt-hashed, JWTs expire, role checks protect admin mutations, Helmet adds secure headers, CORS is allow-listed, and rate limiting protects the API edge. Production should add request schema validation, refresh-token rotation, CSRF strategy if cookies are adopted, structured logging, and secret management.

## Scalability decisions

Equipment is modeled as aggregate units first, keeping the user experience simple. A future `AssetUnit` collection can represent individual serial numbers, QR codes, maintenance states, and condition history without breaking booking APIs. Tenant IDs can be added to every collection for multi-college SaaS.

## UI decisions

The dashboard is designed for repeated operational scanning: dense tables, status colors, availability cards, and direct approval actions. Responsive rules collapse navigation and grids for phones.
