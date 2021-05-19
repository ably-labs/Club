# Web client

## Pre-requisites

- Deploy a token authentication service. One is written in `../functions`, which deploys a serverless function with Token Authentication to Firebase cloud functions.

## Getting started

- `cd web`
- Install dependencies: `npm i`
- Run development mode: `npm run dev`
- `cp env.local.example .env.local`
- Update `NEXT_PUBLIC_CLUB2D_API_URL` in `.env.local` to point to your authentication function
- Depending on your auth api implementation, Update `auth.ts` to the correct endpoint (`/createTokenRequest`) and use the correct method: `GET` vs `POST`.

## Deploying to Cloudflare pages

- Create a cloudflare account
- Fork the repo, and create a [cloudflare page](https://pages.cloudflare.com/) pointing to your new Github repo.
- Add these environment variables with their new values (from [getting started](#getting-started)) to your new cloudflare page settings: (the same ones from .env.local):
  - `NEXT_PUBLIC_CLUB2D_API_URL`
  - `NEXT_PUBLIC_ABLY_UPLOAD_FRAME_RATE`
