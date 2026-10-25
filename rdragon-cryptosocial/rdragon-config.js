/* RDRAGON CryptoSocial public config. Fill in BEFORE go-live with a PUBLIC HTTPS endpoint you control.
   Leave blank = offline mode: RDRAGON still auto-replies to every post/comment instantly with a local, text+media-name grounded reply.
   chatEndpoint: OpenAI-compatible /v1/chat/completions URL (CORS-enabled, rate-limited, NO secret key in browser — use a proxy).
   describeEndpoint: base URL exposing POST /api/upload and /api/describe for image/video-frame descriptions (optional). */
window.RDRAGON_CONFIG = { chatEndpoint: "", describeEndpoint: "", storeEndpoint: "" }; /* storeEndpoint: append-only post store (GET/POST /api/events); blank = this browser only */
