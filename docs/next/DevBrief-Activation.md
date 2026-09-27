# DevBrief — Aktivasi ZK Verified Creators & Shielded Pools

**Proyek:** ArtemisZK
**Chain:** Robinhood Chain (Testnet 46630 → Mainnet 4663)
**Versi brief:** v1.1 · 27 Sep 2026 (finalisasi; ejaan file v1.0 diperbaiki, status diperbarui)
**Status awal (asumsi brief ini):** kedua fitur **BELUM AKTIF** untuk publik.

| Fitur | Status kode | Status publik | Target brief ini |
|---|---|---|---|
| ZK Verified Creators | Selesai | Belum aktif | Aktif di mainnet |
| Shielded Pools | Selesai (0xbow v1.2.1) | Mainnet deployed + activated, flags mati | Selesai → testnet → mainnet bertahap |

> **Amandemen owner 2026-09-26:** audit pihak ketiga **dicoret** untuk Shielded Pools.
> Pengganti: review internal tercatat + full test suite + rehearsal testnet + cap
> onchain ketat + guardian pause-deposit-only. Mainnet dengan mock verifier tetap
> dilarang (mock tidak membuktikan apa-apa); mainnet butuh verifier betulan atau
> tetap berlabel rehearsal-grade dengan cap kecil.

> **Catatan 2026-09-27:** pool mainnet SUDAH di-deploy dan diaktivasi (deposit TERBUKA).
> Legal/mobile/perangkat-kedua tetap waived owner. Sisa gerbang: verifikasi source
> Blockscout via UI (payload siap di `deployments/verification/`), flag hosting,
> proof X sungguhan untuk ZK, dan post publik owner.

> **Aturan utama:** tidak ada post, badge, atau copy "live" sebelum checklist **Go / No-Go** di brief ini lolos dan owner memberi persetujuan tertulis.

---

## Bagian 0 — Prinsip Aktivasi

1. **Feature flag dulu, pengumuman belakangan.** Semua fitur dimatikan secara default dan dinyalakan lewat flag server.
2. **Testnet → mainnet terbatas → mainnet penuh.** Tidak ada lompatan langsung.
3. **Setiap aktivasi punya rollback.** Kalau tidak bisa di-rollback, harus ada batas kerugian (cap).
4. **Manifest dulu.** Alamat kontrak masuk `deployments/<network>.json` (lihat DevBrief-Deployments) sebelum dipakai di frontend atau di-post.
5. **Klaim publik mengikuti status nyata.** Copy di situs dan X diperbarui oleh owner setelah setiap tahap lolos, bukan sebelumnya.

---

# BAGIAN A — ZK VERIFIED CREATORS

## A1. Ringkasan

Creator membuktikan kontrol akun X menggunakan **zkTLS (Reclaim Protocol)**. Proof terikat ke wallet deployer lewat context, diverifikasi server, lalu menghasilkan badge `◆ ZK VERIFIED` dengan tombol **Inspect Proof**. Spesifikasi lengkap ada di `DevBrief-1.md` (ZK Verified Creator).

## A2. Feature Flags

| Flag | Default | Fungsi |
|---|---|---|---|
| `ZK_VERIFY_ENABLED` | `false` | Mengaktifkan endpoint `/api/zk/*` |
| `ZK_VERIFY_UI_ENABLED` | `false` | Menampilkan tombol "Verify with ZK" pada token launch yang sudah terdaftar |
| `ZK_BADGE_PUBLIC` | `false` | Menampilkan badge di Showcase & halaman token |
| `ZK_VERIFY_ALLOWLIST` | `[]` | Wallet yang boleh verifikasi saat soft launch |
| `ZK_LANDING_SECTION` | `false` | Section "Zero-Knowledge Verification" di landing page |

`ZK_ADMIN_TOKEN` is required for the authenticated `/api/zk/revoke` endpoint. Apply
`migrations/0008_zk_creator_binding_and_revoke.sql` (applied 2026-09-26) and
`migrations/0009_zk_provider_version.sql` (applied 2026-09-26) before enabling creator verification.
The browser reads effective switches from `/api/features`; no `NEXT_PUBLIC_*` switch may
enable ZK or Shield features.

Flag dibaca dari server (env / config store), **bukan** di-hardcode di bundle client.

## A3. Prasyarat (harus selesai sebelum aktivasi)

- [x] Aplikasi Reclaim terdaftar; `RECLAIM_APP_ID`, `RECLAIM_APP_SECRET`, `RECLAIM_PROVIDER_ID_X` tersimpan di env (kredensial diuji: init request berhasil, secret tidak bocor ke bundle)
- [x] `APP_SECRET` **tidak ada** di bundle client (cek build output; hanya dipakai di route server)
- [ ] Callback URL production terdaftar: `https://artemiszk.tech/api/zk/callback` (perlu akses portal Reclaim — handover owner)
- [x] Database: tabel `zk_sessions` dan `zk_verifications` + unique index `session_id` dan `nonce` (migrasi 0007–0009 diterapkan ke DB dari `.env.local`)
- [x] `verifyProof` dipanggil dengan **TEE attestation wajib**
- [x] Anti-replay: sessionId harus diterbitkan server, status `pending → verified` dalam satu transaksi DB
- [x] Freshness ≤ 10 menit; nonce TTL 5 menit, sekali pakai
- [x] Context binding: `contextAddress == wallet session`
- [x] Deployer check: EVM (tx deploy / event `ArtemisLauncher`) — alamat launcher mainnet: `0xeea9d0f7ee0958c6d59f25162be4e69ba60a0f71`
- [x] Rate limit `/api/zk/init`: 5/jam per IP & per wallet
- [x] Revocation: kolom `revoked_at` + tampilan `REVOKED` di UI (+ audit `zk_revocation_audit`, endpoint revoke bearer-token)
- [x] Monitoring & alert — endpoint `GET /api/zk/metrics` (token `ZK_METRICS_TOKEN`): count sesi per status + gagal per alasan, tanpa data pribadi. Alerting eksternal (cron/pager) = setup operator, lihat §A7
- [x] Copy "What We Do Not Hide" dan "Client-side custody only" sudah diperbarui (lihat DevBrief-1 §9.4)

## A4. Test Wajib (Go / No-Go)

| # | Skenario | Hasil yang diharapkan | Status |
|---|---|---|---|
| 1 | Verifikasi normal (desktop, extension) | Badge muncul | **Butuh manusia** (browser + akun X) |
| 2 | Verifikasi normal (mobile, QR / App Clip) | Badge muncul | **Waived owner** |
| 3 | Kirim proof yang sama 2× | Kedua kali ditolak `unknown_or_used_session` | **Lolos** (vitest) |
| 4 | Ubah 1 byte context | Ditolak `invalid_proof` | **Lolos** (vitest) |
| 5 | Proof > 10 menit | Ditolak `stale_proof` | **Lolos** (vitest) |
| 6 | Wallet bukan deployer | Ditolak `not_deployer` | **Lolos** (vitest) |
| 7 | Handle di proof ≠ handle di form | `handle_mismatch`, badge tidak muncul | **Lolos** (vitest) |
| 8 | sessionId buatan sendiri | Ditolak | **Lolos** (vitest) |
| 9 | Spam `/api/zk/init` | `rate_limited` | **Lolos** (vitest) |
| 10 | Revoke manual oleh admin | Badge berubah ke `REVOKED` | **Lolos** (vitest) |
| 11 | Inspect Proof → Download `proof.json` | File valid, bisa diverifikasi ulang | **Lolos** (vitest, endpoint reverify) |
| 12 | Re-verify proof tersimpan | Status `VALID` | **Lolos** (vitest) |

Skenario otomatis (#3–12) lolos di suite (`tests/zk-routes.test.ts`, `tests/zk.test.ts`).
#1 perlu 1x proof manusia di environment target; #2 waived. Ulangi #1, #3, #6 setelah proof manusia pertama.

## A5. Tahapan Aktivasi

### Tahap A-1 — Testnet internal
- `ZK_VERIFY_ENABLED=true`, `ZK_VERIFY_UI_ENABLED=true` di testnet
- Tim menjalankan tabel A4 lengkap
- **Keluar tahap jika:** 12/12 lolos, tidak ada error di log selama 48 jam
- **Status 2026-09-27:** menunggu proof manusia #1; sisanya hijau

### Tahap A-2 — Mainnet soft launch (allowlist)
- Mainnet: `ZK_VERIFY_ENABLED=true`, `ZK_VERIFY_UI_ENABLED=true`, `ZK_VERIFY_ALLOWLIST=[wallet tim + 5–10 creator terpercaya]`
- `ZK_BADGE_PUBLIC=false` (badge hanya terlihat oleh pemilik)
- Durasi minimal: **3 hari**
- **Keluar tahap jika:** ≥ 10 verifikasi sukses, 0 bypass keamanan, tingkat gagal karena bug < 5%

### Tahap A-3 — Mainnet publik
- `ZK_VERIFY_ALLOWLIST` dikosongkan (semua boleh)
- `ZK_BADGE_PUBLIC=true`
- `ZK_LANDING_SECTION=true`
- Owner memperbarui bio / post (setelah approval)

## A6. Rollback

| Masalah | Aksi |
|---|---|
| Bug verifikasi / bypass keamanan | `ZK_VERIFY_ENABLED=false` (endpoint mati, badge lama tetap tampil) |
| Badge palsu terdeteksi | `ZK_BADGE_PUBLIC=false` + revoke badge terkait + audit log |
| Reclaim down | UI tampilkan "Verification temporarily unavailable"; tidak ada perubahan data |

Rollback tidak menghapus data; hanya mematikan akses. Setiap rollback dicatat di changelog publik.

## A7. Monitoring

- `GET /api/zk/metrics?token=ZK_METRICS_TOKEN` (atau header `Authorization: Bearer`): jumlah sesi per status, gagal per `fail_reason`, verifikasi 24 jam terakhir. Tanpa data pribadi.
- Alert eksternal yang perlu dipasang operator (cron + pager): `invalid_proof` melonjak > 5× rata-rata, atau verifikasi dengan `session_id` duplikat (seharusnya mustahil — indikasi bug kritis bila terjadi).
- Log tidak boleh menyimpan data pribadi selain handle publik & wallet (dipatuhi: hanya handle/wallet/proof_json yang disimpan).

---

# BAGIAN B — SHIELDED POOLS

## B1. Ringkasan

Pool privasi berbasis **commitment–nullifier** (model Zerocash) dengan **association set** (model Privacy Pools, Buterin et al. 2023):

- **Deposit:** user mengirim aset → commitment `C = H(nullifier, secret, …)` masuk Merkle tree onchain → user menyimpan **note** (nullifier + secret) di perangkatnya
- **Withdraw:** user membuat ZK proof bahwa ia mengetahui preimage salah satu commitment di tree, tanpa menyebut yang mana → mengungkap `nullifierHash` untuk mencegah double spend → dana dikirim ke alamat baru
- **Association set:** withdraw juga membuktikan commitment termasuk dalam set deposit yang "diterima" (bukan terkait sumber ilegal yang diketahui)

## B2. Keputusan Desain (dikunci owner)

| Topik | Opsi | Rekomendasi | Keputusan 2026-09-27 |
|---|---|---|---|
| Basis kode | Tulis sendiri / fork `0xbow privacy-pools-core` | **Fork + audit ulang** | **Fork 0xbow v1.2.1** (pin `a80836a`, Apache-2.0; `ShieldedPool.sol` custom jadi fixture rehearsal saja) |
| Proof system | Groth16 (Circom) / PLONK-UltraHonk (Noir) | Verifier Solidity teruji; Groth16 butuh ceremony | **Groth16 Circom** artefak upstream rilis (zkey/WASM/VK checksum cocok); tanpa ceremony baru |
| Aset | ETH saja / ETH + ERC20 | **ETH saja di v1** | **ETH saja** |
| Nominal | Bebas / pecahan tetap | **Pecahan tetap** | **Tetap: testnet 0.001 ETH; mainnet 0.001 ETH** (sesuai deploy 2026-09-27; naikkan hanya via pool baru) |
| Kedalaman Merkle tree | 20 / 32 | Sesuaikan gas Robinhood | **Upstream default** (State.sol patch: histori root 64 entri) |
| Association set provider | Artemis sendiri / pihak ketiga | Dokumentasi publik wajib | **Artemis sendiri** — lihat §B2.1 |
| Relayer | Tanpa / Artemis / terbuka | **Diperlukan** (penerima & fee di public input) | **Relayer Artemis** (satu wallet; fee relay 0) |
| Emergency pause | Ada / tidak ada | Lihat B3 | **Opsi 1**: guardian pause-deposit-only; withdraw tak pernah bisa di-pause |
| Deposit cap | Per tx & total pool | Wajib fase awal | **10 ETH lifetime, onchain** |

The 0.001 ETH denomination is the faucet-compatible rehearsal value, also used for the
cautious mainnet start. It does not determine any future denomination (requires a new pool).

### B2.1 Association Set Provider (publik)

- **Siapa:** Artemis (operator satu-wallet: deployer = ASP postman = guardian = relayer).
- **Kriteria masuk set:** setiap deposit terkonfirmasi di pool tercatat labelnya; dataset dipublikasikan immutable ke IPFS (CID) dan root-nya di-set onchain oleh postman setelah finalitas (13 konfirmasi). Set ini **bukan layanan screening sanksi** — ia menyatakan "deposit ini terlihat di pool ini", bukan "deposit ini bersih".
- **Keberatan/banding:** relayer menolak withdraw yang labelnya di luar set yang berlaku; pengguna dapat meminta publikasi ulang lewat kanal publik Artemis (X @artemislauncher). Proses banding formal + screening pihak ketiga belum ada (di luar scope aktivasi ini).
- **Rotasi root:** postman menerbitkan dataset baru + `updateRoot` onchain; histori dataset tercatat di manifest (`associationSetHistory`).

## B3. Catatan: Pause vs "No Owner Roles"

Artemis menjanjikan "no owner roles" untuk **token**. Shielded pool berbeda: pool yang memegang dana user tanpa tombol darurat berisiko besar jika ada bug circuit.

Dipilih **Opsi 1** dan diumumkan di sini + `/contracts` + "What We Do Not Hide":
- Guardian (satu wallet operator) hanya bisa **pause deposit** (dan sudah dipakai sekali? belum — pause belum pernah dipicu; hak aktivasi satu-kali sudah dipakai 2026-09-27).
- Tidak bisa menahan atau memindahkan dana; withdraw tetap selalu bisa.
- Renounce penuh dijadwalkan setelah periode rollout stabil (keputusan tanggal menyusul; dicatat di sini saat terjadi).

## B4. Sisa Pekerjaan (50% → 100%)

Status 2026-09-27: implementasi + deploy + aktivasi mainnet selesai. "Implemented" = kode dan artefak siap; "deployed" = tx terkonfirmasi.

| # | Komponen | Status |
|---|---|---|
| 1 | Circuit deposit / withdraw (commitment, Merkle membership, nullifier) | Selesai — artefak upstream terpin, checksum + reproduksibilitas verifier lolos |
| 2 | Circuit association set membership | Selesai — di dalam circuit withdrawal + builder LeanIMT deterministik |
| 3 | Trusted setup ceremony | Selesai (tanpa ceremony baru) — zkey upstream publik; tidak ada ceremony Artemis |
| 4 | Verifier contract (auto-generated) | Selesai — dari zkey terpin, compile 0.8.28 |
| 5 | `ShieldedPool` contract (deposit, withdraw, tree, nullifier set) | Selesai — pool mainnet `0x2cd3…cead9`, paused→**activated 2026-09-27** (tx `0x1330…acc16`) |
| 6 | Association set root updater + dokumentasi kriteria | Selesai — publisher + postman update; kriteria di §B2.1 |
| 7 | Relayer service (+ fee di public input) | Selesai (kode) — **butuh hosting berjalan** (handover) |
| 8 | Client: generate note, backup note, proving di browser (WASM) | Selesai (kode + testnet E2E nyata) |
| 9 | Client: indexer event deposit untuk rebuild Merkle tree | Selesai — replay + reorg checks, chunked |
| 10 | UI Shield (deposit, saldo shielded, withdraw) | Selesai (kode, gated off) — visual browser belum dikonfirmasi manual |
| 11 | Test suite (unit, circuit, fuzz, invariant) | Selesai — 532 vitest + Forge 6/6 + 256 fuzz; verifier kolaborator test-only (soundness proof = E2E testnet nyata) |
| 12 | Audit circuit + kontrak (pihak ketiga) | Dicoret owner 2026-09-26; review internal tercatat tanpa temuan critical/high terbuka |
| 13 | Review hukum | Waived owner 2026-09-26; bukan checklist proyek |

## B5. Feature Flags

| Flag | Default | Fungsi |
|---|---|---|
| `SHIELD_ENABLED` | `false` | Mengaktifkan halaman / tab Shield |
| `SHIELD_DEPOSIT_ENABLED` | `false` | Deposit bisa dilakukan |
| `SHIELD_WITHDRAW_ENABLED` | `false` | Withdraw bisa dilakukan (setelah aktif, **tidak pernah** dimatikan kecuali darurat bug client) |
| `SHIELD_CLIENT_READY` | `false` | Atestasi operator bahwa backup and browser proving rehearsal passed |
| `SHIELD_INDEXER_READY` | `false` | Atestasi operator bahwa recovery and reorg checks passed |
| `SHIELD_RELAYER_READY` | `false` | Atestasi operator bahwa shared rate limiting and relayed withdrawal passed |
| `SHIELD_REHEARSAL_COMPLETE` | `false` | Final testnet rehearsal gate for user actions |

> Semua flag masih `false` (2026-09-27). Menyalakannya butuh deploy hosting (env Vercel) + atestasi di atas — handover operator.

## B6. Test Wajib (Go / No-Go)

| # | Skenario | Hasil yang diharapkan | Status 2026-09-27 |
|---|---|---|---|
| 1 | Deposit → withdraw ke alamat baru via relayer | Sukses, dana diterima | **Lolos** (testnet E2E 0.001 ETH; sweep kembali; hash di manifest) |
| 2 | Withdraw dengan note yang sama 2× | Kedua ditolak (nullifier) | **Lolos** (`nullifier_already_spent`) |
| 3 | Proof dengan Merkle root palsu / kedaluwarsa | Ditolak | **Lolos** (relayer menolak pre-broadcast) |
| 4 | Relayer mencoba ganti penerima / fee | Proof gagal diverifikasi | **Lolos** (recipient binding) |
| 5 | Commitment di luar association set | Withdraw ditolak | **Lolos** (app-level excluded-label test) |
| 6 | Deposit melebihi cap | Ditolak oleh kontrak | **Lolos** (`eth_call` override → `PoolDepositCapExceeded`) |
| 7 | Note hilang | Dana tidak bisa diambil (UI memperingatkan) | **Lolos kode** (warning + acknowledgement wajib; backup terenkripsi diuji). Visual browser manual belum — bukan gate owner |
| 8 | Rebuild tree dari event di browser baru | Saldo & note valid | **Lolos** (SDK recovery + rebuild cocok root onchain). Perangkat kedua waived |
| 9 | Proving di mobile browser | Selesai wajar / sarankan desktop | **Waived owner** |
| 10 | Pause (guardian) | Deposit berhenti, **withdraw tetap jalan** | **Lolos** (`eth_call` override + simulasi withdraw saat paused) |
| 11 | Front-running withdraw tx | Tidak bisa mengalihkan dana | **Lolos** (recipient-context binding; tanpa simulasi mempool terkontrol) |
| 12 | Fuzz / invariant: total deposit − total withdraw = saldo kontrak | Selalu benar | **Lolos** (rekonsiliasi onchain 0.007−0.006=0.001; model 2000-op; Forge 6/6 + 256 fuzz). Kolaborator verifier test-only |

## B7. Tahapan Aktivasi

### Tahap B-1 — Testnet internal (Chain ID 46630) — SELESAI
- Kontrak + verifier + ASP genesis deployed; nilai onchain dicek via RPC. Manifest: `deployments/robinhood-testnet-privacy-pools-v1.2.1-0.001eth.json`.
- Rehearsal 0.001 ETH: deposit→withdraw, recovery, ASP publish, proving, relay, sweep, replay/recipient/stale-root rejection. Cap & pause via `eth_call` override. Rekonsiliasi 7−6 = 0.001 ETH cocok. Sisa 0.001 ETH residual (note hilang, dianggap terkunci).
- Exit terpenuhi: semua B6 non-waived lolos; review internal tercatat tanpa critical/high terbuka.

### Tahap B-2 — Testnet publik
- Umumkan: "Shielded Pools on testnet. Break it." (setelah approval owner) — **BELUM dilakukan (handover owner)**
- Durasi minimal **2 minggu** — **BELUM berjalan**
- **Keluar tahap jika:** tidak ada bug keamanan terbuka, UX backup note diperbaiki dari feedback

### Tahap B-3 — Mainnet terbatas (Chain ID 4663) — DEPLOYED, FLAG MATI
- Deploy 2026-09-27 dari commit `a66ab2e` (tercatat di manifest `deployer` setara; tag git menyusul bila owner meminta): 10 tx terkonfirmasi — 7 kontrak + updateRoot + registerPool + renounceRole.
- Pool: `0x2cd3f5e42791e29b89b6d98f71087774c6ecead9` — **activated** (tx `0x1330…acc16`), deposit TERBUKA, denominasi 0.001 ETH, cap 10 ETH.
- Manifest mainnet + verifikasi: manifest ✓; **verifikasi source Blockscout 7/7 ADA** (2026-09-27): exact match = WithdrawalVerifier, PoseidonT3, PoseidonT4, CommitmentVerifier; partial match = Entrypoint, pool (flattened paths). Partial → exact dapat di-upgrade kapan saja via endpoint standard-input setelah rate limit reset (payload path-asli siap di `deployments/verification/minimal/`). Flat source ter-commit di `deployments/verification/flat/`.
- `SHIELD_ENABLED/WITHDRAW/DEPOSIT` + allowlist + cap rendah: **BELUM** (butuh deploy hosting; handover operator).
- Durasi 1–2 minggu dimulai saat flag hosting dinyalakan.

### Tahap B-4 — Mainnet publik
- Allowlist dikosongkan, cap dinaikkan bertahap — **BELUM**
- Owner memperbarui bio, landing page, post — **BELUM (handover owner)**

## B8. Legal & Risiko — WAIVED OWNER 2026-09-26 untuk scope aktivasi ini
- [x] ~~Review penasihat hukum~~ — waived (risiko dicatat di sini, bukan dihilangkan)
- [x] Kebijakan association set publik — selesai di §B2.1
- [x] ~~ToS & pembatasan wilayah~~ — waived; tidak ada ToS khusus Shield (risiko dicatat)
- [x] Kebijakan Robinhood Chain — tidak ada pelanggaran yang diketahui; RPC/D
...[truncated 2119 chars]