# Production Setup (Vercel) — ArtemisZK

Target: `https://artemiszk.tech` serves `main`. Nothing below activates any
public feature; all UI flags stay off until the staged rollout in
`DevBrief-Activation.md`.

**Status 2026-09-27: DONE via Vercel CLI** (all vars below set for Production,
fresh production deployment Ready and verified: zk endpoints live with UI dark,
shield configured on mainnet pool with all flags off).

## 1. Open Vercel

Project → Settings → Environment Variables. Add each variable for the
**Production** environment only. Redeploy afterwards (Deployments → Redeploy).

## 2. Variables to add

### Shield mainnet config (read-only wiring, no activation)

| Name | Value |
|---|---|
| `SHIELD_CHAIN_ID` | `4663` |
| `SHIELD_DEPLOYMENT_MANIFEST` | `robinhood-mainnet-privacy-pools-v1.2.1-0.001eth.json` |
| `SHIELD_MAINNET_DEPLOYMENT_MANIFEST` | `robinhood-mainnet-privacy-pools-v1.2.1-0.001eth.json` |
| `SHIELD_MAINNET_RPC_URL` | `https://robinhood-rpc.publicnode.com` |
| `SHIELD_MAINNET_ASP_ROOT` | `21888242871839275222246405745257275088548364400416034343698204186575808495616` |
| `SHIELD_MAINNET_ASP_CID` | `QmVtkNm5Ro2F1oVBdP17TxcAcafXtMoG8rYPnu7S8kXJxV` |
| `SHIELD_OPERATOR_ADDRESS` | `0xCdbdc82A021071eE445d9f897433a7E4B4EAfD8d` |
| `SHIELD_MAINNET_GUARDIAN_ADDRESS` | `0xCdbdc82A021071eE445d9f897433a7E4B4EAfD8d` |
| `SHIELD_MAINNET_VERIFIER_READY` | `true` |
| `SHIELD_MAINNET_BROADCAST_ENABLED` | `false` (never true on hosting) |

### ZK creator (API ready, UI dark)

| Name | Value |
|---|---|
| `RECLAIM_APP_ID` | copy from `.env.local` |
| `RECLAIM_APP_SECRET` | copy from `.env.local` |
| `RECLAIM_PROVIDER_ID_X` | copy from `.env.local` |
| `ZK_ADMIN_TOKEN` | `hm5yISq3CPiijHjfkZPV_E1P6tFtdZO1` (generated 2026-09-27; rotate anytime) |
| `ZK_METRICS_TOKEN` | `mRsidVa_psA_VOHcYInuoPUq7ZDxP0kM` (generated 2026-09-27; rotate anytime) |
| `ZK_VERIFY_ENABLED` | `true` (endpoints live, UI still gated below) |

### Leave OFF / unset (activation gates)

Do NOT set these to true yet: `ZK_VERIFY_UI_ENABLED`, `ZK_BADGE_PUBLIC`,
`ZK_LANDING_SECTION`, `ZK_VERIFY_ALLOWLIST` (set at A-2), `SHIELD_ENABLED`,
`SHIELD_DEPOSIT_ENABLED`, `SHIELD_WITHDRAW_ENABLED`, `SHIELD_CLIENT_READY`,
`SHIELD_INDEXER_READY`, `SHIELD_RELAYER_READY`, `SHIELD_REHEARSAL_COMPLETE`,
`NEXT_PUBLIC_ZK_LIVE`, `NEXT_PUBLIC_SHIELD_ENABLED`, relayer private keys.

## 3. Verify after redeploy (all read-only)

- `https://artemiszk.tech/api/features` → zk.enabled true, everything else false; shield all false.
- `https://artemiszk.tech/api/shield/config` → `configured: true`, `chainId: 4663`, pool `0x2cd3…`, `enabled: false`.
- `https://artemiszk.tech/contracts` → new **Shield 4663** tab lists pool, entrypoint, verifiers.
- Landing page renders exactly as before (no ZK/Shield sections).

## 4. Later (separate owner decisions, see DevBrief-Activation)

- A-1: one real X proof in production → A-2 allowlist + 10 proofs → A-3 flags + posts.
- B-3: relayer key + gas, flags true, posts. B-4: unlist, raise caps, posts.
