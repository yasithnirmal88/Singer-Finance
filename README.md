# Singer Finance

A hire-purchase (HP) sales tracker for a Singer dealer in Sri Lanka. Operators
record credit sales, keep a customer and price list, and restore or back up the
sales history as Excel files.

## Stack

- React 19 + TypeScript
- Vite 5 (with Vitest 3 for the test suite)
- Ant Design 6, Tailwind CSS 4
- Firebase Auth + Firestore (the source of truth)
- xlsx for Excel export/import

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a Firebase project and enable Email/Password and Google sign-in,
   then create a Firestore database.

3. Copy `.env.example` to `.env` and fill in the Firebase web app keys:

   ```sh
   cp .env.example .env
   ```

   `.env` is git-ignored; never commit real Firebase keys.

4. Deploy the Firestore security rules before using the app (see
   [Firestore rules](#firestore-rules)).

5. Start the dev server:

   ```sh
   npm run dev
   ```

## Scripts

| Command            | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `npm run dev`      | Vite dev server with HMR                        |
| `npm run build`    | Typecheck (`tsc -b`) then production build      |
| `npm run preview`  | Serve the production build locally              |
| `npm run lint`     | ESLint over the whole tree                      |
| `npm test`         | Vitest suite (runs once)                        |
| `npm run test:watch` | Vitest in watch mode                          |

## Data layout

Firestore stores everything under the signed-in user, keyed by its natural
identifier so a document id always matches the entity it holds:

```
users/{uid}/sales/{invoiceNo}        e.g. 0001
users/{uid}/customers/{epfNumber}    e.g. EPF-001
users/{uid}/items/{modelNumber}      e.g. SIS-REF-01
```

Reads go through a single `DataProvider` (one `onSnapshot` per collection for
the whole app) into React contexts, so mounting several screens never opens
duplicate subscriptions. A localStorage cache per collection (`sf_sales`,
`sf_customers`, `sf_items`) is written on a debounce; it only speeds up cold
loads and is never treated as the truth.

## Firestore rules

Deploy the rules file so only each user can reach their own data:

```sh
firebase deploy --only firestore:rules
```

`firestore.rules` scopes every read and write to `users/{uid}` where
`request.auth.uid == userId`. See the file itself for the exact match.

## Deployment

This is a single-page app in which every screen is a real URL, so the web host
must serve `index.html` for any unknown path (SPA fallback). Firebase Hosting
does this with a `rewrites` rule:

```json
{
  "hosting": {
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

Without the fallback, a shared deep link like `/history` returns a 404 on
reload or paste, even though the route exists in the client.

## Tests

The suite replaces the Firebase SDK with in-memory stubs (`src/test/stubs`) so
it runs without a network or credentials. The Firestore double stages batch
writes, so the rollback behavior on a failed commit is exercised for real.

```sh
npm test
```

Covered by the same gates as the app: test files live under `src`, so
`tsc -b` typechecks them and `eslint .` lints them.

## Project structure

```
src/
  config/company.ts        company name, contact details on printed invoices
  contexts/                AuthProvider, DataProvider, data contexts
  hooks/                   context selectors (useSales, useCustomers, useItems)
  utils/                   formatting, pricing, Excel and sales-sheet logic
  components/
    SalesHistory/          history table, details modal, restore, print
    NewSale/, Customers/, Items/, DataManagement/, Print/, Layout/
  pages/                   routed shells (Dashboard, Login)
  test/                    Vitest setup and Firebase stubs
```