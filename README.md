# JotPsych Feature Shorts

One text box, one Go button, one vertical video. Type a JotPsych feature and get a short comedy video starring a talking animal.

## How it works
1. `POST /api/start` asks a Gemini text model for a 3-scene script (hook, what it does, punchline), then starts 3 Veo 3.1 Lite jobs (9:16, 6s, 720p each) and returns right away.
2. The page polls `GET /api/status` every 4s per scene. When a scene is done, the function downloads the clip and stores it in Vercel Blob (falls back to a data URL if no Blob store is linked).
3. The page plays the clips back to back in one player. Captions are a real text track (`addTextTrack`), styled with the brand colors; the player sits in a Sunset-to-Afterglow frame on a Midnight/Deep background.

Cost per video: 3 x 6s x ~$0.05/s on Lite = about $0.90.

## Deploy (Vercel)
1. Push this folder to a GitHub repo.
2. Vercel -> Add New Project -> import the repo. Framework preset: Other. No build command.
3. Settings -> Environment Variables: add `GEMINI_API_KEY` (Production, Preview, Development).
4. Storage -> Create -> Blob -> connect it to the project (this adds `BLOB_READ_WRITE_TOKEN`).
5. Deploy (or Redeploy after adding the variables).
6. Open the URL in a private window, type a feature, press Go.

## Local run (optional)
```
cp .env.example .env   # fill in the key
npx vercel dev
```
