# TEACH RDRAGON · DS-IMG-GEN-01 · offline image making (2026-10-25)

Everything runs on Neo, offline. Engine: stable-diffusion.cpp `sd-cli` (Metal) + Stable Diffusion 1.5 fp16 + TAESD decoder.
Files: `~/ЯLAB/RFORGE/RDRAGON/IMG-GEN-01/{bin,models,out}` (one copy; `~/ЯLAB/RUNTIME/img-gen/{bin,models,out}` are symlinks).

## How RDRAGON makes a picture
1. **Recognize intent** (WRAP `img_chat`, runs before DS-AGENT/model on every chat turn):
   - `draw me …`, `draw a …`, `sketch/paint/illustrate …`
   - `make / create / generate / render me a picture|image|drawing|logo|icon of …`
   - `show me what X looks like`
   - `can you create an image of …`
   - `/img …`, `/draw …`
   - Follow-ups after a picture: `another`, `again`, `one more`, `more colorful`, `more <word>`, `pixel art style`, `watercolor`, `anime`, `photo`, `cartoon`, `sketch`, `3d`, `neon`, `cyberpunk`, `low poly`, `<x> style`.
2. **Write the SD1.5 prompt**: `subject, style, lighting, centered composition, high quality` + negative
   `blurry, lowres, deformed, extra limbs, bad anatomy, watermark, text, signature, jpeg artifacts`.
3. **Call** `POST 127.0.0.1:8319/api/img/gen {"prompt":..., "negative":...}` → `img-gen.sh` pauses :4989 (moondream) + :4879 (heart), draws, resumes them.
4. **Show it**: reply contains `![subject](/api/img/file/img-….png)`; the `chat-images` skill renders it inline. File path printed too.
5. **Offer variations** and **be honest about time**.

## Prompt recipes
| Ask | Style words added |
|---|---|
| pixel art | pixel art, 16-bit, crisp pixels, limited palette |
| logo / icon | flat vector logo, simple shapes, centered, plain white background, bold |
| photo | photorealistic, 35mm photo, natural light, sharp focus |
| watercolor | watercolor painting, soft washes, paper texture |
| anime | anime style, cel shaded, clean lineart |
| cartoon | cartoon style, bold outlines, bright colors |
| oil | oil painting, rich brush strokes |
| 3d | 3d render, studio lighting |
| neon / cyberpunk | neon glow, dark background, synthwave / neon city lights |
| (none) | digital illustration, highly detailed, soft cinematic lighting |

Tips: subject first; one subject per picture; name colors and setting; don't ask for words/letters.

## 10 example conversations
1. U: hey can you draw me a dragon made of clouds → R: draws "a dragon made of clouds, digital illustration…", shows it, offers variations.
2. U: another → same subject, new random seed.
3. U: more colorful → adds "more colorful, vibrant".
4. U: pixel art style → same subject in pixel art.
5. U: make a picture of a cozy cabin at sunset → draws it.
6. U: show me what a castle on the moon looks like → draws "a castle on the moon".
7. U: can you create an image of a robot logo → flat vector logo recipe.
8. U: /draw a fox reading a book, watercolor → watercolor recipe.
9. U: draw something → asks what to draw, or redraws the last subject.
10. U: make a poster that says HAPPY BIRTHDAY → draws it but warns SD1.5 can't write readable text.

## Limits (say these honestly)
- 512×512, SD1.5 quality; no readable text/letters; hands and faces can be off.
- **Slow on this Neo right now: several minutes per image** (A18 Pro, 8 GB; measured ~35–40 s per step on Metal under heavy swap). Vision and heart are paused while drawing and resume after.
- LCM-LoRA (fast 4-step) is downloaded but **disabled**: this prebuilt sd.cpp aborts applying it on Metal (`pre-allocated tensor … in a buffer (MTL0) that cannot run the operation (ADD)`) and matched 0/834 LoRA keys. No rebuild per rule.
- One image at a time. Kill switch: env `DS_IMG=off` disables chat intent.

## SAFETY GATE (2026-10-25)
Neo rebooted at 00:48 MT during the first test image. Drawing is DISARMED until the Decider runs `touch ~/ЯLAB/RUNTIME/img-gen/ARMED`; even when armed, WRAP refuses if swap use is over 2.5 GB and tells the user why.
