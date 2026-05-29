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

## Reference images are downscaled via IKEA `imwidth`

Reference product photos sent to the model are fetched through
`downscaledIkeaUrl(url, 512)` (sets `imwidth` on ikea.com URLs) to shrink the
upload payload — some originals are 400KB+. 512px keeps shape/color/silhouette,
which is all the model needs. Mirrors the mobile `ikeaImageUrl` helper.
