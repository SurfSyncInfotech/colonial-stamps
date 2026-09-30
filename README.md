# Folio Stamp House

Customer shop, admin desk, and one API. No Docker.

## Run

1. Put your MySQL password in `backend/.env` as `DB_PASSWORD`.
2. From this folder:

```bash
npm run db:setup
npm run dev
```

- Shop: http://localhost:5173
- Desk: http://localhost:5174
- API: http://localhost:4000

## Sample desk

- Customer: `meera.iyer@folio.test` / `Customer@12345` (approved)
- Pending customer: `rohan.kapoor@folio.test` / `Customer@12345`
- Admin: `admin@folio.test` / `Admin@12345`
- Orders desk: `orders@folio.test` / `Admin@12345`
- Stock desk: `stock@folio.test` / `Admin@12345`
- Content desk: `desk@folio.test` / `Admin@12345`

Development OTP is `123456`. Card and UPI checkout use the dummy payment provider. Swap `OTP_PROVIDER` and `PAYMENT_PROVIDER` in `backend/.env` when real credentials arrive.

Seed rows are marked `is_sample = 1`.
