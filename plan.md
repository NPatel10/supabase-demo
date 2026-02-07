# Supabase Demo Project Plan

## Goal
Create a small, modular test project that demonstrates:
1. Auto-generated APIs
2. Authentication and Authorization
3. Real-time capabilities
4. Storage
5. Edge Functions

The project uses multiple small UI screens rather than one large workflow.

---

## Proposed Structure

```
supabase-demo/
|- apps/
|  |- web/                        # React app (Vite recommended)
|  |  |- index.html
|  |  |- src/
|  |  |  |- screens/
|  |  |  |  |- ApiExplorer.tsx     # Auto-generated APIs demo
|  |  |  |  |- AuthDemo.tsx        # Auth + RLS demo
|  |  |  |  |- RealtimeDemo.tsx    # Realtime subscriptions demo
|  |  |  |  |- StorageDemo.tsx     # File upload/download demo
|  |  |  |  `- EdgeFnDemo.tsx      # Edge Functions demo
|  |  |  |- components/
|  |  |  |- lib/
|  |  |  |  |- supabaseClient.ts   # Single client instance
|  |  |  |  `- api.ts              # Shared helpers
|  |  |  |- App.tsx                # App shell + routes
|  |  |  `- main.tsx               # React entry
|  |  |- package.json
|  |  `- vite.config.ts
|  
|- supabase/                      # Supabase local project
|  |- migrations/                 # SQL schema + RLS policies
|  |- seed.sql                    # Optional demo data
|  |- functions/                  # Edge Functions
|  |  |- hello-world/
|  |  `- signed-url/
|  `- config.toml
|  
|- docs/
|  |- setup.md                    # How to run locally
|  `- demo-script.md              # Step-by-step demo script
|  
`- plan.md
```

---

## Demo Screens (Small, Focused)

### 1) Auto-generated APIs (ApiExplorer)
- Schema: `book_store` table with CRUD.
- UI: list, create, update, delete.
- Shows: Supabase REST API + client SDK using table CRUD.
- Optional angle for video: open the auto-generated API docs for the table and show a request/response snippet.

### 2) Authentication + Authorization (AuthDemo)
- Sign up / sign in / sign out.
- RLS policy demo with a `profiles` or `notes` table.
- UI: only show user-owned rows (verify RLS).

### 3) Realtime (RealtimeDemo)
- Table: `messages` or `activity_log`.
- UI: live feed using `postgres_changes`.
- Shows multiple browser tabs updating in real time.

### 4) Storage (StorageDemo)
- Bucket: `avatars` or `files`.
- UI: upload, list, download, delete.
- Show public vs. private bucket with signed URL example.

### 5) Edge Functions (EdgeFnDemo)
- Function: `hello-world` (echo input / return JSON).
- Function: `signed-url` (generate signed upload/download URLs).
- UI: call function, show result and/or use signed URLs.

---

## Suggested Supabase Schema

### Tables
- `book_store` (id, title, author, genre, published_year, created_at)
- `notes` (id, user_id, content, created_at)
- `messages` (id, user_id, message, created_at)

### Policies
- `notes`: only owner can select/insert/update/delete.
- `messages`: select allowed for authenticated users, insert for self.

---

## Minimal Workflow
1. Start Supabase locally (or connect to a hosted project).
2. Run migrations + seed.
3. Launch web app.
4. Use nav to jump between demo screens.

---

## Suggested Video Flow
1. Quick intro: show the nav and what each screen demonstrates.
2. Auth demo first to create a user and explain RLS in one minute.
3. Auto-generated API demo with `book_store` CRUD and the API docs page.
4. Realtime demo in two browser tabs to show live updates.
5. Storage demo with an upload and a signed URL.
6. Edge Function demo calling `hello-world`, then `signed-url` to prove server-side logic.

---

## Why This Structure Works
- Keeps each feature isolated and easy to demo.
- Minimizes coupling between features.
- Easy to extend with new demo screens later.
