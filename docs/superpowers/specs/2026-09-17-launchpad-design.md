# Launchpad ala Luce — Design Spec

Tanggal: 2026-09-17. Status: disetujui user. Klon konsep lucepad.com, stack Next.js, deploy Vercel gratis.

## 1. Tujuan

Web no-code buat launch koin + kolam trading via sign wallet. AI chat (Mimo v2.5) bantu isi draft. Fokus 2 rel: direct-pool Hood Chain + pump.fun Solana. Non-custodial, tanpa pegang dana user.

## 2. Non-tujuan v1

Tanpa bonding curve sendiri, tanpa bridge antar chain, tanpa presale/IDO, tanpa lock likuiditas custom, tanpa launcher atomik 1-tx (butuh kontrak + audit = fase 2), tanpa mobile app, tanpa e2e otomatis.

## 3. Arsitektur

Next 16 + React 19 + Tailwind (seragam repo wealthypeople). App Router.

```
Browser
├── / → studio: chat AI + karakter 3D + form launch + review dialog
├── /tokens → showcase katalog
└── /api
    ├── /api/status → flag AI + daftar network
    ├── /api/chat → proxy Mimo v2.5 (key server-only)
    └── /api/community → CRUD showcase (Neon)
Eksekusi di wallet user (server tak sign, tak pegang dana):
├── Hood 4663 → 1 tx token + pool via router V2
└── Solana → tx pump.fun via PumpPortal, sign Phantom/Solflare
```

Batas Vercel gratis (~60s/fungsi): semua tx berat di browser. Server cuma chat + katalog.

## 4. Komponen

1. Chat studio (client): composer maxlength 1000, saran cepat, badge status AI.
2. Karakter 3D (client): three.js drag/arrow-key, fallback PNG diam.
3. Form + Review (client): ticker wajib, nama opsional default ticker, chain picker, likuiditas, token pool. Dialog review + centang consent dana asli untuk mainnet.
4. Konektor wallet (client): EVM `eth_requestAccounts`, cek `eth_chainId`, `wallet_switchEthereumChain` + fallback `wallet_addEthereumChain`. Solana: Phantom/Solflare `connect` + `signTransaction`.
5. Launcher Hood (client lib, viem/wagmi): 2 tx jujur v1 — tx1 deploy ERC20 fixed-supply 999jt (template sendiri, tanpa mint/tax), tx2 `addLiquidityETH` via router. Validasi router dulu (`WETH()`, factory match, `getCode` bukan 0x). Tunggu receipt tiap tx, simpan receipt localStorage. Alasan 2-tx: router V2 tak bisa deploy token; launcher atomik 1-tx butuh kontrak sendiri + audit = fase 2, bukan v1.
6. Launcher pump.fun (client lib, @solana/web3.js): rakit tx via PumpPortal, kirim, konfirmasi, simpan receipt. Gagal step akhir = tombol resume.
7. api/chat (server): system prompt kunci output draft JSON `{name, ticker, pooled, liquidity, route}`. Tanpa key = mode form manual.
8. api/community + Neon (server): tabel `tokens(chain, address, creator, name, symbol, pool, tx_hash, profile, created_at)`.
9. api/status (server): `{configured, model, networks[]}`.

## 5. Konfig chain (hasil bedah onchain)

| Chain | ID | Router/rel | Factory | RPC | Explorer |
|---|---|---|---|---|---|
| Hood | 4663 | `0x89e5db8b5aa49aa85ac63f691524311aeb649eba` (V2) | `0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f` | `https://robinhood-rpc.publicnode.com` (resmi diblokir ISP lokal) | blockscout + stonscan |
| Hood WETH | — | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` | — | — | — |
| Solana | mainnet | pump.fun via PumpPortal | — | `https://api.mainnet-beta.solana.com` | solscan |
| Test | Hood 46630, Solana devnet | Hood testnet: deployment V2 BELUM verifikasi — resolve saat plan (cari router/factory 46630 atau deploy template + pool manual di testnet). Solana devnet: pump.fun tak ada di devnet → gladi via devnet SPL + Raydium devnet bila ada, else mock review tanpa broadcast. | testnet masing-masing | testnet explorer |

Supply: direct 999.000.000 fixed, tanpa mint. Token referensi onchain: `$LUCE 0x0977...59ec4` (name LucePad, 18 desimal, 1M supply).

## 6. Data flow

Chat → draft JSON → form (edit manual bisa) → review + consent → connect wallet → sign → receipt lokal + POST showcase → render `/tokens`. AI offline kapan pun = form tetap jalan.

## 7. Error handling

- Tx revert: tampil reason + ingatkan gas hangus. Hood 2-tx: gagal tx2 → token ngendon di wallet + tombol resume add-liquidity (mirip Solana). Solana token bisa ngendon → resume.
- RPC mati: pesan + saran endpoint alternatif (daftar §5).
- AI mati: badge offline, form manual.
- Validasi: ticker kosong/receipt chain salah = tolak sebelum sign.

## 8. Testing

- `vitest`: unit parser draft, validasi form, konstanta supply.
- Manual live: Hood testnet 46630 + Solana devnet dulu, baru mainnet kecil.
- Checklist rilis: connect, switch chain, tx sukses, receipt tersimpan, showcase muncul, resume Solana + resume Hood tx2.

## 9. Env

`LLM_API_URL` (default endpoint OpenAI-compatible Mimo, pola helios2), `LLM_API_KEY` (Mimo, user supply belakangan), `LLM_MODEL=mimo-v2.5`, `DATABASE_URL` (Neon). Tanpa `LLM_*` = chat mati by design, web tetap jalan.

## 10. Risiko jujur (tampil di web)

Staging, belum audit. LP direct unlocked bisa withdraw. Tak janji buyer/listing. Mainnet = uang asli. Testnet dulu.
