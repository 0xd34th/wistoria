---
name: RevenueCat subscriptions gating
description: Non-obvious rules for the Wistoria free-quota + Pro entitlement gating that aren't visible from a single file.
---

# RevenueCat subscription gating

The free-redesign gate and the Pro entitlement gate both depend on data that
hydrates asynchronously. Two independent async sources must BOTH be resolved
before gating is correct:

- entitlement status from `getCustomerInfo()` (react-query)
- the free-usage counter from AsyncStorage

**Rule:** never gate or enable the generate action until both are hydrated.
**Why:** on a cold start the free counter defaults to 0 (looks like quota
available) and the customer-info query is still loading (a real subscriber
looks like a free user). Gating during that window either hands out a free
redesign to an exhausted user or shows a subscriber the paywall. The create
screen waits on `isCustomerInfoLoading === false && useFreeUsage().isLoaded`.

**Rule:** gate on customer-info loading, NOT the combined offerings loading.
**Why:** offerings only feed the paywall UI; on web/sandbox the analytics
endpoint (`e.revenue.cat`) is blocked and offerings can be slow/flaky, so
blocking generation on offerings could hang the button.

**Rule:** the free counter is monotonic and its write must be awaited before
navigating to the result. **Why:** deletions of saved redesigns must not reset
quota (anti-farm), and a fire-and-forget write can be lost if the session is
interrupted, granting an extra free run.

**Rule:** restore-purchases unlocks ONLY when the specific `"pro"` entitlement
is active, not "any active entitlement".

**Test mode:** `isRevenueCatTestMode()` is true on web, Expo Go, and dev. In
the workspace preview the app always runs against the RevenueCat Test Store
(real purchases never fire), so the paywall uses an in-component confirm overlay
rather than `Alert.alert`. The seed script's products/entitlement/offering are
created fresh each run — only run `seed:revenuecat` when intentionally
provisioning.

## Pro is daily-capped, not unlimited (and caps are client-side)
Pro entitlement is NOT unlimited: it is `PRO_DAILY_LIMIT` (currently 5) redesigns
per local calendar day (`useDailyUsage`, key `@wistoria_pro_daily_used`, stores
`{date,count}`, resets on date change). Free stays 1/device lifetime.

**Why:** every redesign calls gpt-image-2 edit (~$0.04-0.05/run — reference
images bill at HIGH fidelity regardless of output `quality`), so an uncapped Pro
plan can cost more than the $9.99/mo subscription. 5/day (~150/mo) is roughly
break-even worst case and profitable in normal use.

**How to apply:** gate BOTH create AND regenerate identically — both are paid
generations (free = 1 lifetime across both; Pro = daily cap across both). Persist
the quota BEFORE setState and ONLY after a successful generation. Exhausted free
→ paywall; Pro at cap → inline notice (not the paywall). Caps are deliberately
CLIENT-SIDE: the app is anonymous/client-trust and `deviceId` is client-supplied,
so a server check keyed by `deviceId` is equally bypassable; real anti-abuse
needs backend entitlement verification (out of scope). Do not "upgrade" this to a
server check without also adding auth-level entitlement verification.
