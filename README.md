# SoftRPG

SoftRPG is a Node.js/Express game server with a lightweight frontend.

## Railway deployment

1. Create a new Railway project.
2. Connect a Node.js service.
3. In `Settings > Variables`, add the required environment variables:
   - `AI_PROVIDER` (e.g. `openai`)
   - `OPENAI_API_KEY`
   - `OPENAI_API_BASE_URL` or `LLM_ENDPOINT` for Azure OpenAI
   - `OPENAI_MODEL` or `LLM_MODEL`
   - `DATABASE_URL`
   - `REDIS_URL`
   - `SESSION_SECRET`
4. Railway will detect `package.json` and install dependencies.
5. The provided `Procfile` launches the app with:
   - `web: npm start`

## Run locally

1. Copy `.env.example` to `.env` and fill in values.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start locally:
   ```bash
   npm start
   ```

## Notes

- The server listens on `process.env.PORT`.
- Static frontend assets are served from `public/`.
- Character data is stored in memory for now.
