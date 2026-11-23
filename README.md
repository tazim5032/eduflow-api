# EduFlow API (v2)

The TypeScript/Express API for **EduFlow**, rebuilt in 2026.

The full project (web app + this API) lives in **[tazim5032/edu-flow-client](https://github.com/tazim5032/edu-flow-client)**, which is the recommended place to run it from.

**Live demo:** https://tazim-eduflow.netlify.app

## Run this API on its own

```bash
npm install
npm run dev     # starts the API with hot reload
npm run reset-data
```

Stack: Express, TypeScript, Zod validation, JWT auth, bcrypt, JSON-file data store (`src/db.ts`).
