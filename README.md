# WaterNav prototype

WaterNav is a local demonstration for treated-wastewater reuse planning around the Waluj–Shendra–Chikalthana industrial region. **Every record is fictional, labelled `DEMO DATA — NOT VERIFIED`, and must not be used as evidence of supply, pipeline infrastructure, approvals, or customer commitments.**

## Run locally

Requires Node.js 18+. From this directory:

```bash
npm install
npm run dev
```

No database or local environment file is required. Vite runs on `http://localhost:5173` and proxies `/api` to Express on port `5000`.

The React app runs at http://localhost:5173 and the Express API at http://localhost:5000. Use `npm test` for the included backend smoke test and `npm run build --prefix frontend` for a production frontend build.

## Railway deployment

WaterNav deploys as **one Railway service**: Express serves the built Vite app and its API under the same domain.

1. Push this repository to GitHub and create a Railway service from it.
2. Set the build command to `npm run build` and start command to `npm start`. Railway supplies `PORT`; do not hard-code a public port.
3. Add `NODE_ENV=production` and `CORS_ORIGIN=https://<your Railway domain>` to Railway Variables. See `.env.example` for variable names only.
4. Deploy and verify `https://<your-domain>/api/health` returns `status: ok` and `mode: illustrative-demo`.

The dashboard, directories, maps, and calculator read bundled **illustrative, unverified** fixtures. Enquiries and their status changes are held only in the running server's memory and are discarded on restart; they are never permanent records or shared across server instances.

The map uses Leaflet with OpenStreetMap and Esri tiles, not Google Maps. No Google browser key is required by the current code; check provider attribution and production usage terms before scaling this prototype.

## Data and limitations

Sample STPs and industries are stored in `backend/data/stps.json` and `backend/data/industries.json`; replace them only with appropriately verified source data, including a verification status and dates. `backend/data/requests.json` supplies initial example requests; new or edited requests are retained only in server memory for the active session.

Cost outputs are illustrative only. Validate water quality, reliability, contracts, legal approvals, site suitability and infrastructure engineering independently.
