// GET /api/status?op=models/.../operations/...
// Checks one Veo job once. When done, downloads the clip and returns a playable URL.
import { put } from "@vercel/blob";
import { BASE, VEO_MODEL, apiKey, gfetch } from "../lib/gemini.js";

// Only ever poll Veo operations of our own model, so the key can't be pointed elsewhere.
const OP_RE = new RegExp(
  `^models/${VEO_MODEL.replace(/[.\-]/g, "\\$&")}/operations/[A-Za-z0-9_-]+$`
);

export default async function handler(req, res) {
  const op = String(req.query?.op || "");
  if (!OP_RE.test(op)) {
    return res.status(400).json({ error: "Bad operation id" });
  }

  try {
    const r = await gfetch(op);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res
        .status(502)
        .json({ error: j?.error?.message || `Status check failed (${r.status})` });
    }
    if (!j.done) return res.status(200).json({ done: false });

    if (j.error) {
      return res
        .status(200)
        .json({ done: true, error: "failed", detail: j.error.message });
    }

    const vr = j.response?.generateVideoResponse;
    const uri = vr?.generatedSamples?.[0]?.video?.uri;
    if (!uri) {
      // Filtered by safety: Google does not charge for these.
      return res.status(200).json({
        done: true,
        error: "blocked",
        detail: vr?.raiMediaFilteredReasons?.[0] || null,
      });
    }
    if (!uri.startsWith(`${BASE}/files/`)) {
      return res.status(502).json({ error: "Unexpected video location" });
    }

    const dl = await fetch(uri, { headers: { "x-goog-api-key": apiKey() } });
    if (!dl.ok) {
      return res
        .status(502)
        .json({ error: `Video download failed (${dl.status})` });
    }
    const buf = Buffer.from(await dl.arrayBuffer());

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`clips/${Date.now()}.mp4`, buf, {
        access: "public",
        contentType: "video/mp4",
        addRandomSuffix: true,
      });
      return res.status(200).json({ done: true, url: blob.url });
    }

    // Fallback if no Blob store is linked: a 6s 720p clip is ~2MB, which fits in the response.
    return res.status(200).json({
      done: true,
      url: `data:video/mp4;base64,${buf.toString("base64")}`,
    });
  } catch (err) {
    console.error("status error:", err?.message);
    return res.status(500).json({ error: "Status check failed" });
  }
}
