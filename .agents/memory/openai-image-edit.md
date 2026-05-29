---
name: OpenAI image edit (gpt-image-2) quirks
description: Non-obvious constraints when calling openai.images.edit with gpt-image-2 for the Wistoria redesign route
---

## gpt-image-2 does NOT support `input_fidelity`

`openai.images.edit({ model: "gpt-image-2", input_fidelity: "high", ... })`
fails with HTTP 400 `invalid_input_fidelity_model`: "The model 'gpt-image-2'
does not support the 'input_fidelity' parameter." The redesign route maps that
to a 502, so every redesign/regenerate breaks.

**Why it bites:** the `openai` SDK *types* accept `input_fidelity` (it's valid
for some image models), so typecheck passes and it looks supported — but the
API rejects it specifically for gpt-image-2. Do not re-add it.
`quality: "high"` IS supported and is fine to keep.

**Trap:** the api-server dev workflow runs `build && start` with plain `node`
(no watch). Code edits do NOT take effect until the workflow is restarted, so a
stale running process can mask or fake-confirm a change. Always restart
`artifacts/api-server: API Server` after editing server code before judging
behavior.

## Generation must finish under the ~120s proxy timeout

The Replit reverse proxy aborts a request at ~120s. The server logs it as
`request aborted` with `responseTime: ~120737` and `statusCode: null`; the
client/mobile receives the proxy's own HTML 502 ("Hmm... We couldn't reach
this app"), NOT an app error. `quality: "high"` on gpt-image-2 pushed
generation to 120s+ and tripped this every time. `quality: "medium"` keeps
generation in the ~50-70s range (with 5 reference images) and stays safely
under the limit.

**Why:** the user sees "curating your space" then a failure — that is the
proxy timeout, not an OpenAI error. Furniture *matching* comes from the
reference images, not the `quality` param, so dropping high->medium does not
hurt match quality. If generation ever needs to exceed ~120s, it must become
an async/polling job instead of a single synchronous request.

## Reference images are downscaled via IKEA `imwidth`

Reference product photos sent to the model are fetched through
`downscaledIkeaUrl(url, 512)` (sets `imwidth` on ikea.com URLs) to shrink the
upload payload — some originals are 400KB+. 512px keeps shape/color/silhouette,
which is all the model needs. Mirrors the mobile `ikeaImageUrl` helper.
