# ReplayHub API

A high-performance API for hosting and searching Geometry Dash replays.

## Tech Stack

- **Node.js** & **TypeScript**
- **Fastify**: High-performance web framework
- **PostgreSQL**: Relational database
- **Prisma**: ORM for type-safe database access

## Setup

1.  **Database**:
    Ensure you have PostgreSQL running. You can use the provided `docker-compose.yml` if you have Docker installed:
    ```bash
    docker compose up -d
    ```
    
    Or use a managed Postgres service.

2.  **Environment Variables**:
    Create a `.env` file in the root directory (if not present) and set your database URL (the Docker config exposes Postgres at `5433` to avoid conflicts with any system Postgres):
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5433/replayhub?schema=public"
    ```

3.  **Install Dependencies**:
    ```bash
    npm install
    ```

4.  **Database Migration**:
    Apply the schema to your database:
    ```bash
    npx prisma migrate dev --name init
    ```

5.  **Start Server**:
    ```bash
    npm run dev
    ```

## API Endpoints

### GET /replays
Search for replays.

**Query Parameters:**
- `format` (string): e.g., ".gdr"
- `fps` (number): e.g., 60.0
- `name` (string): Partial match, case-insensitive
- `author` (string): Partial match, case-insensitive
- `verified` (boolean): true/false
- `levelId` (integer)
- `authorId` (integer)
- `page` (integer): Default 1
- `limit` (integer): Default 50

**Example:**
`GET /replays?name=bloodbath&fps=240`

### POST /replays
Upload a new replay.

**Body (JSON):**
```json
{
  "format": ".gdr",
  "fps": 240.0,
  "name": "Bloodbath 100%",
  "author": "Riot",
  "verified": true,
  "levelId": 123456,
  "authorId": 789,
  "data": "base64_encoded_string_of_file_content"
}
```

Note: The API expects the `data` field to be a Base64-encoded string of the file content. The API will decode this and store the raw bytes in the database. When downloading, the raw bytes are served directly.

## Frontend

A tiny single-page client is served at `/` (from `public/index.html`). It lets you:

- search with all supported filters (format, FPS, name, author, verified, level/author IDs).
- upload .gdr/.echo/.mhr files (the client handles Base64 encoding before sending).

The backend also protects against duplicate uploads: when a file is posted, Prisma first queries existing records that share the same name and compares a SHA-256 hash of the bytes. If no match is found, it repeats the hash comparison across entries for the same `levelId`. Any hash collision returns a 409 so you never store the same replay twice even if the metadata toggles slightly.

The page talks to the same Fastify server, so just run `npm run dev` and visit `http://localhost:3000`.

## Extensibility

To add more fields:
1.  Edit `prisma/schema.prisma` and add the new field to the `Replay` model.
2.  Run `npx prisma migrate dev` to update the database.
3.  Update `src/routes/replays.ts` to include the new field in search/create logic.

