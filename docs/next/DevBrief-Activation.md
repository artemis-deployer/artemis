# DevBrief — Aktivasi ZK Verified Creators & Shielded Pools

**Proyek:** ArtemisZK
**Chain:** Robinhood Chain (Testnet 46630 → Mainnet 4663)
**Versi brief:** v1.0 · 26 Sep 2026
**Status awal (asumsi brief ini):** kedua fitur **BELUM AKTIF** untuk publik.

| Fitur | Status kode | Status publik | Target brief ini |
|---|---|---|---|
| ZK Verified Creators | Selesai | Belum aktif | Aktif di mainnet |
| Shielded Pools | ±50% | Belum aktif | Selesai → testnet → mainnet bertahap |

> **Amandemen owner 2026-09-26:** audit pihak ketiga **dicoret** untuk Shielded Pools.
> Pengganti: review internal tercatat + full test suite + rehearsal testnet + cap
> onchain ketat + guardian pause-deposit-only. Mainnet dengan mock verifier tetap
> dilarang (mock tidak membuktikan apa-apa); mainnet butuh verifier betulan atau
> tetap berlabel rehearsal-grade dengan cap kecil.

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

Creator membuktikan kontrol akun X menggunakan **zkTLS (Reclaim Protocol)**. Proof terikat ke wallet deployer lewat context, diverifikasi server, lalu menghasilkan badge `◆ ZK VERIFIED` dengan tombol **Inspect Proof**. Spesifikasi lengkap ada di `DevBrief.md` (ZK Verified Creator).

## A2. Feature Flags

| Flag | Default | Fungsi |
|---|---|---|
| `ZK_VERIFY_ENABLED` | `false` | Mengaktifkan endpoint `/api/zk/*` |
| `ZK_VERIFY_UI_ENABLED` | `false` | Menampilkan tombol "Verify with ZK" di Launch Studio |
| `ZK_BADGE_PUBLIC` | `false` | Menampilkan badge di Showcase & halaman token |
| `ZK_VERIFY_ALLOWLIST` | `[]` | Wallet yang boleh verifikasi saat soft launch |
| `ZK_LANDING_SECTION` | `false` | Section "Zero-Knowledge Verification" di landing page |

Flag dibaca dari server (env / config store), **bukan** di-hardcode di bundle client.

## A3. Prasyarat (harus selesai sebelum aktivasi)

- [ ] Aplikasi Reclaim **production** terdaftar; `RECLAIM_APP_ID`, `RECLAIM_APP_SECRET`, `RECLAIM_PROVIDER_ID_X` tersimpan di env production
- [ ] `APP_SECRET` **tidak ada** di bundle client (cek build output: `grep -r` pada folder build)
- [ ] Callback URL production terdaftar: `https://artemiszk.tech/api/zk/callback`
- [ ] Database production: tabel `zk_sessions` dan `zk_verifications` + unique index `session_id` dan `nonce`
- [ ] `verifyProof` dipanggil dengan **TEE attestation wajib**
- [ ] Anti-replay: sessionId harus diterbitkan server, status `pending → verified` dalam satu transaksi DB
- [ ] Freshness ≤ 10 menit; nonce TTL 5 menit, sekali pakai
- [ ] Context binding: `contextAddress == wallet session`
- [ ] Deployer check: EVM (tx deploy / event `ArtemisLauncher`) — alamat launcher mainnet: `0xeea9d0f7ee0958c6d59f25162be4e69ba60a0f71`
- [ ] Rate limit `/api/zk/init`: 5/jam per IP & per wallet
- [ ] Revocation: kolom `revoked_at` + tampilan `REVOKED` di UI
- [ ] Monitoring & alert (lihat A7)
- [ ] Copy "What We Do Not Hide" dan "Client-side custody only" sudah diperbarui (lihat DevBrief ZK §9.4)

## A4. Test Wajib (Go / No-Go)

| # | Skenario | Hasil yang diharapkan |
|---|---|---|
| 1 | Verifikasi normal (desktop, extension) | Badge muncul |
| 2 | Verifikasi normal (mobile, QR / App Clip) | Badge muncul |
| 3 | Kirim proof yang sama 2× | Kedua kali ditolak `unknown_or_used_session` |
| 4 | Ubah 1 byte context | Ditolak `invalid_proof` |
| 5 | Proof > 10 menit | Ditolak `stale_proof` |
| 6 | Wallet bukan deployer | Ditolak `not_deployer` |
| 7 | Handle di proof ≠ handle di form | `handle_mismatch`, badge tidak muncul |
| 8 | sessionId buatan sendiri | Ditolak |
| 9 | Spam `/api/zk/init` | `rate_limited` |
| 10 | Revoke manual oleh admin | Badge berubah ke `REVOKED` |
| 11 | Inspect Proof → Download `proof.json` | File valid, bisa diverifikasi ulang |
| 12 | Re-verify proof tersimpan | Status `VALID` |

Semua 12 harus lolos di **testnet** dan diulang untuk #1, #3, #6 di **mainnet**.

## A5. Tahapan Aktivasi

### Tahap A-1 — Testnet internal
- `ZK_VERIFY_ENABLED=true`, `ZK_VERIFY_UI_ENABLED=true` di testnet
- Tim menjalankan tabel A4 lengkap
- **Keluar tahap jika:** 12/12 lolos, tidak ada error di log selama 48 jam

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

- Jumlah `init`, `verified`, `failed` per jam, dikelompokkan per `fail_reason`
- Alert jika: `invalid_proof` melonjak > 5× rata-rata, atau ada verifikasi dengan `session_id` duplikat (seharusnya mustahil)
- Log tidak boleh menyimpan data pribadi selain handle publik & wallet

---

# BAGIAN B — SHIELDED POOLS

## B1. Ringkasan

Pool privasi berbasis **commitment–nullifier** (model Zerocash) dengan **association set** (model Privacy Pools, Buterin et al. 2023):

- **Deposit:** user mengirim aset → commitment `C = H(nullifier, secret, …)` masuk Merkle tree onchain → user menyimpan **note** (nullifier + secret) di perangkatnya
- **Withdraw:** user membuat ZK proof bahwa ia mengetahui preimage salah satu commitment di tree, tanpa menyebut yang mana → mengungkap `nullifierHash` untuk mencegah double spend → dana dikirim ke alamat baru
- **Association set:** withdraw juga membuktikan commitment termasuk dalam set deposit yang "diterima" (bukan terkait sumber ilegal yang diketahui)

## B2. Keputusan Desain (harus dikunci sebelum lanjut dari 50%)

Developer isi kolom "Keputusan" dan owner menyetujui.

| Topik | Opsi | Rekomendasi | Keputusan |
|---|---|---|---|
| Basis kode | Tulis sendiri / fork `0xbow privacy-pools-core` | **Fork + audit ulang** (lebih aman daripada dari nol). Cek lisensi repo sebelum fork | [ ] |
| Proof system | Groth16 (Circom) / PLONK-UltraHonk (Noir) | Pilih yang punya verifier Solidity teruji; Groth16 butuh **trusted setup ceremony** | [ ] |
| Aset | ETH saja / ETH + ERC20 | **ETH saja di v1** | [ ] |
| Nominal | Bebas / pecahan tetap (0.1, 1, 10 ETH) | **Pecahan tetap** memperbesar anonymity set | [ ] |
| Kedalaman Merkle tree | 20 / 32 | Sesuaikan dengan batas gas di Robinhood Chain | [ ] |
| Association set provider | Artemis sendiri / pihak ketiga | Harus terdokumentasi publik: siapa, kriteria, proses keberatan | [ ] |
| Relayer | Tanpa relayer / relayer Artemis / relayer terbuka | **Diperlukan** — alamat baru tidak punya ETH untuk gas. Relayer tidak boleh bisa mengubah penerima (penerima & fee masuk public input) | [ ] |
| Emergency pause | Ada / tidak ada | Lihat B3 | [ ] |
| Deposit cap | Per tx & total pool | Wajib selama fase awal | [ ] |

## B3. Catatan: Pause vs "No Owner Roles"

Artemis menjanjikan "no owner roles" untuk **token**. Shielded pool berbeda: pool yang memegang dana user tanpa tombol darurat berisiko besar jika ada bug circuit.

Pilih salah satu dan **umumkan terbuka**:
- **Opsi 1:** Guardian multisig (mis. 3/5) hanya bisa **pause deposit**, tidak bisa menahan atau memindahkan dana, withdraw tetap selalu bisa. Hak ini **dihapus (renounce)** setelah periode tertentu.
- **Opsi 2:** Tanpa pause sama sekali, dengan deposit cap ketat dan audit lebih dari satu.

Apa pun pilihannya, tulis di halaman `/contracts` dan di "What We Do Not Hide".

## B4. Sisa Pekerjaan (50% → 100%)

Developer mengisi status aktual per item.

| # | Komponen | Status |
|---|---|---|
| 1 | Circuit deposit / withdraw (commitment, Merkle membership, nullifier) | [ ] |
| 2 | Circuit association set membership | [ ] |
| 3 | Trusted setup ceremony (jika Groth16) + transkrip publik | [ ] |
| 4 | Verifier contract (auto-generated) | [ ] |
| 5 | `ShieldedPool` contract (deposit, withdraw, tree, nullifier set) | [ ] |
| 6 | Association set root updater + dokumentasi kriteria | [ ] |
| 7 | Relayer service (+ fee di public input) | [ ] |
| 8 | Client: generate note, backup note, proving di browser (WASM) | [ ] |
| 9 | Client: indexer event deposit untuk rebuild Merkle tree | [ ] |
| 10 | UI Shield (deposit, saldo shielded, withdraw) | [ ] |
| 11 | Test suite (unit, circuit, fuzz, invariant) | [ ] |
| 12 | Audit circuit + kontrak (pihak ketiga) | [ ] |
| 13 | Review hukum (lihat B8) | [ ] |

## B5. Feature Flags

| Flag | Default | Fungsi |
|---|---|---|
| `SHIELD_ENABLED` | `false` | Mengaktifkan halaman / tab Shield |
| `SHIELD_DEPOSIT_ENABLED` | `false` | Deposit bisa dilakukan |
| `SHIELD_WITHDRAW_ENABLED` | `false` | Withdraw bisa dilakukan (setelah aktif, **tidak pernah** dimatikan kecuali darurat bug client) |
| `SHIELD_ALLOWLIST` | `[]` | Wallet yang boleh deposit saat soft launch |
| `SHIELD_MAX_DEPOSIT` | `[X] ETH` | Batas per tx (juga ditegakkan di kontrak) |
| `SHIELD_POOL_CAP` | `[Y] ETH` | Batas total pool (juga ditegakkan di kontrak) |

> Batas deposit **wajib ditegakkan di kontrak**, bukan hanya di UI. UI bisa dilewati.

## B6. Test Wajib (Go / No-Go)

| # | Skenario | Hasil yang diharapkan |
|---|---|---|
| 1 | Deposit → withdraw ke alamat baru via relayer | Sukses, dana diterima |
| 2 | Withdraw dengan note yang sama 2× | Kedua ditolak (nullifier) |
| 3 | Proof dengan Merkle root palsu / kedaluwarsa | Ditolak |
| 4 | Relayer mencoba ganti penerima / fee | Proof gagal diverifikasi |
| 5 | Commitment di luar association set | Withdraw ditolak |
| 6 | Deposit melebihi cap | Ditolak oleh kontrak |
| 7 | Note hilang | Dana tidak bisa diambil (UI harus memperingatkan sebelum deposit) |
| 8 | Rebuild tree dari event di browser baru | Saldo & note valid |
| 9 | Proving di mobile browser | Selesai dalam waktu wajar, atau UI menyarankan desktop |
| 10 | Pause (jika ada guardian) | Deposit berhenti, **withdraw tetap jalan** |
| 11 | Front-running withdraw tx | Tidak bisa mengalihkan dana |
| 12 | Fuzz / invariant: total deposit − total withdraw = saldo kontrak | Selalu benar |

## B7. Tahapan Aktivasi

### Tahap B-1 — Testnet internal (Chain ID 46630)
- Deploy `ShieldedPool`, `Verifier`, (association set contract) → manifest testnet
- Verifikasi source di explorer testnet
- Jalankan tabel B6 lengkap
- **Keluar tahap jika:** 12/12 lolos, **review internal tercatat tanpa temuan critical/high yang terbuka** (audit pihak ketiga dicoret per amandemen owner 2026-09-26)

### Tahap B-2 — Testnet publik
- Umumkan: "Shielded Pools on testnet. Break it." (setelah approval owner)
- Durasi minimal **2 minggu**
- Opsional: bug bounty
- **Keluar tahap jika:** tidak ada bug keamanan terbuka, UX backup note sudah diperbaiki berdasarkan feedback

### Tahap B-3 — Mainnet terbatas (Chain ID 4663)
- Deploy dari **commit yang sama** dengan yang diaudit (tag git)
- Manifest mainnet + verifikasi Blockscout
- `SHIELD_ENABLED=true`, `SHIELD_WITHDRAW_ENABLED=true`, `SHIELD_DEPOSIT_ENABLED=true` + allowlist + cap rendah
- Durasi minimal **1–2 minggu**

### Tahap B-4 — Mainnet publik
- Allowlist dikosongkan, cap dinaikkan bertahap (bukan dihapus sekaligus)
- Owner memperbarui bio, landing page, dan post "What we shipped" (setelah approval)

## B8. Legal & Risiko (wajib sebelum B-3)

Pool privasi punya sejarah hukum yang sensitif (kasus Tornado Cash dan layanan mixer lain). **Sebelum mainnet**:
- [ ] Review oleh penasihat hukum yang paham regulasi kripto di yurisdiksi tim
- [ ] Kebijakan association set terdokumentasi publik (siapa, kriteria, cara banding)
- [ ] Syarat penggunaan (ToS) & pembatasan wilayah bila diperlukan
- [ ] Pastikan tidak ada kebijakan Robinhood Chain yang dilanggar

Copy publik **tidak boleh** memakai kata: *mixer, tumbler, untraceable, anonymous, launder, regulator-proof*. Gunakan: *shielded pool, private by choice, provably clean*.

## B9. Rollback / Darurat

| Masalah | Aksi |
|---|---|
| Bug di UI / client | `SHIELD_DEPOSIT_ENABLED=false`; withdraw tetap jalan |
| Bug di circuit / kontrak | Pause deposit (jika ada guardian) + pengumuman publik dalam 1 jam + panduan withdraw |
| Relayer down | UI tampilkan opsi withdraw langsung (user membayar gas sendiri) |
| Association set salah menandai deposit | Proses banding publik + update root |

**Withdraw tidak boleh diblokir oleh Artemis dalam kondisi apa pun.** Itu inti dari self-custody.

## B10. Monitoring

- TVL pool, jumlah deposit / withdraw per hari, ukuran anonymity set per pecahan
- Alert: nullifier ganda (seharusnya mustahil), withdraw ke root yang tidak dikenal, saldo kontrak ≠ invariant
- Dashboard publik (opsional): TVL & ukuran anonymity set

---

# BAGIAN C — Serah Terima ke Owner

Untuk **setiap tahap**, developer menyerahkan:

1. Checklist tahap ini (terisi)
2. Hasil test (tabel A4 / B6) dengan tanggal & network
3. Manifest `deployments/<network>.json` terbaru (jika ada kontrak baru)
4. Daftar flag yang berubah (sebelum → sesudah)
5. Rencana rollback yang sudah dicoba minimal sekali

Owner hanya boleh memposting setelah menerima kelima hal ini.

## Copy yang Boleh Dipakai per Tahap

| Tahap | Copy publik |
|---|---|
| A-1, A-2 | *(tidak ada post)* |
| A-3 | "ZK Verified Creators are live on Robinhood Chain." |
| B-1 | *(tidak ada post)* |
| B-2 | "Shielded Pools are live on testnet. Break it." |
| B-3 | "Shielded Pools are live on mainnet, with deposit caps during rollout." |
| B-4 | "Shielded Pools are live on Robinhood Chain." |

---

## Referensi

- DevBrief.md — ZK Verified Creator (spesifikasi teknis)
- DevBrief-Deployments.md — manifest & verifikasi kontrak
- Reclaim Protocol JS SDK — https://github.com/reclaimprotocol/reclaim-js-sdk
- 0xbow Privacy Pools core — https://github.com/0xbow-io/privacy-pools-core
- Buterin et al. (2023), *Blockchain Privacy and Regulatory Compliance: Towards a Practical Equilibrium*
- Ben-Sasson et al. (2014), *Zerocash: Decentralized Anonymous Payments from Bitcoin*
