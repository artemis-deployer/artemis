# DevBrief: Deployment Manifest & Public Contract Links

**Proyek:** Artemis / ArtemisZK
**Tujuan:** Setiap deploy (testnet → mainnet) menghasilkan daftar kontrak yang **terverifikasi di explorer** dan siap diposting ke X, mirip format post Quanta Pools.
**Versi brief:** v1.0 · 24 Sep 2026

---

## 0. TL;DR untuk Developer

Setiap kali deploy, kamu wajib menyerahkan **3 hal**:

1. `deployments/<network>.json`: manifest semua alamat kontrak (format di §3)
2. **Semua kontrak milik Artemis terverifikasi** (source code terbuka) di Blockscout
3. `deployments/<network>.post.md`: teks post X yang sudah terisi, dibuat otomatis dari manifest (template di §6)

Owner/founder **hanya memposting** dari file itu. Tidak ada alamat yang diketik manual.

---

## 1. Jaringan

| | Testnet | Mainnet |
|---|---|---|
| Nama | Robinhood Chain Testnet | Robinhood Chain |
| Chain ID | `46630` | `4663` *(konfirmasi dengan docs resmi Robinhood Chain sebelum deploy)* |
| Explorer | `https://explorer.testnet.chain.robinhood.com` | `https://robinhoodchain.blockscout.com` |
| Format link | `<explorer>/address/<address>` | `<explorer>/address/<address>` |

Solana (pump.fun rail) tidak men-deploy kontrak milik Artemis, jadi tidak masuk manifest. Kalau nanti ada program Solana sendiri, tambahkan bagian `solana` dengan link ke Solscan.

---

## 2. Apa yang Masuk Manifest

Kelompokkan persis seperti ini. **Hanya cantumkan kontrak yang benar-benar sudah di-deploy.** Jangan membuat grup kosong atau nama kontrak yang belum ada.

### A. CORE (kontrak milik Artemis)
Contoh (sesuaikan dengan kontrak yang benar-benar ada di repo):
- `ArtemisLauncher`: deploy ERC20 fixed 999M + add liquidity atomik
- `ArtemisToken` (implementation / contoh token hasil launch, jika pakai pola factory)
- `ArtemisFactory` / `TokenRegistry` (jika ada)

### B. ZK LAYER (hanya jika sudah live)
- `ZkAttestationRegistry`: jika badge ZK Verified disimpan onchain (roadmap v3 di DevBrief ZK)
- `ShieldedPool` / `Verifier`: **hanya** setelah shielded pool di-deploy dan diaudit

### C. EXTERNAL / CANONICAL DEPENDENCIES (bukan milik Artemis)
- Uniswap V2 Router: `0x89e5db8b5aa49aa85ac63f691524311aeb649eba` (mainnet, sudah dipakai di situs)
- Uniswap V2 Factory, WETH, dll. yang dipakai launcher

> **Penting:** grup C wajib diberi label "External", supaya publik tidak mengira Artemis yang membuat kontrak tersebut. Mengklaim kontrak orang lain sebagai milik sendiri akan cepat ketahuan di explorer.

---

## 3. Format `deployments/<network>.json`

```json
{
  "project": "ArtemisZK",
  "network": "robinhood-mainnet",
  "chainId": 4663,
  "explorer": "https://robinhoodchain.blockscout.com",
  "deployBlock": 0,
  "deployedAt": "2026-09-24T12:00:00Z",
  "deployer": "0x...",
  "gitCommit": "abc1234",
  "contracts": [
    {
      "group": "CORE",
      "name": "ArtemisLauncher",
      "address": "0x...",
      "txHash": "0x...",
      "verified": true,
      "owner": "none",
      "notes": "Deploys fixed 999M ERC20 and pairs with ETH atomically"
    }
  ],
  "external": [
    {
      "name": "Uniswap V2 Router",
      "address": "0x89e5db8b5aa49aa85ac63f691524311aeb649eba"
    }
  ]
}
```

Aturan:
- Address dalam format **checksum** (EIP-55).
- `verified` hanya boleh `true` jika source code benar-benar sudah terverifikasi di explorer.
- `owner`: tulis `"none"` jika kontrak tidak punya owner (sesuai klaim "No owner roles"). Kalau ada owner/admin, tulis alamatnya **dan** apakah itu multisig. Klaim di situs harus sama dengan kenyataan ini.
- File testnet dan mainnet terpisah: `robinhood-testnet.json` dan `robinhood-mainnet.json`.
- Commit file ini ke repo (publik jika repo publik).

---

## 4. Script yang Harus Dibuat

### 4.1 Deploy script
- Foundry (`script/Deploy.s.sol`) atau Hardhat (`scripts/deploy.ts`), terserah stack yang dipakai.
- Setelah deploy, script **menulis otomatis** `deployments/<network>.json` (address, txHash, block, commit).
- Private key deployer dari env var / hardware wallet. **Jangan pernah** di-commit.

### 4.2 Verifikasi di Blockscout
Contoh Foundry (konfirmasi URL API dengan docs Blockscout):

```bash
forge verify-contract <ADDRESS> src/ArtemisLauncher.sol:ArtemisLauncher \
  --chain-id 4663 \
  --verifier blockscout \
  --verifier-url https://robinhoodchain.blockscout.com/api/
```

Hardhat: pakai `@nomicfoundation/hardhat-verify` dengan `customChains` untuk chain 4663 dan 46630.

Setelah verifikasi, cek manual: halaman address di explorer harus menampilkan tab **Contract → Source code ✓ Verified**.

### 4.3 Generator post
Script kecil `scripts/make-post.ts` yang membaca manifest dan mencetak `deployments/<network>.post.md` sesuai template §6.

---

## 5. Alur Testnet → Mainnet

```
[1] Deploy ke Robinhood Testnet (46630)
      → manifest testnet + verifikasi + post testnet
[2] QA di testnet (launch token, add liquidity, ZK badge jika ada)
      → minimal 1 minggu, catat semua bug
[3] Freeze kode → tag git (mis. v1.0.0) → audit / review keamanan
[4] Deploy ke Mainnet (4663) dari commit yang SAMA dengan tag
      → manifest mainnet + verifikasi + post mainnet
[5] Update situs: halaman /contracts (lihat §7) + ganti alamat di frontend
[6] Owner review manifest → baru posting
```

**Aturan:** `gitCommit` di manifest mainnet harus sama dengan tag yang diaudit/diuji.

---

## 6. Template Post X

### 6.1 Testnet

```
ArtemisZK is now live on Robinhood Chain Testnet.

Chain ID: 46630

CORE
ArtemisLauncher
explorer.testnet.chain.robinhood.com/address/0x...

[ZK LAYER, only if deployed]

EXTERNAL
Uniswap V2 Router
explorer.testnet.chain.robinhood.com/address/0x...

All Artemis contracts are verified. No owner roles, no mint functions.
Rehearse your launch for free before mainnet.
```

### 6.2 Mainnet

```
ArtemisZK is live on Robinhood Chain Mainnet.

Chain ID: 4663
Deploy block: [BLOCK]
Commit: [GIT TAG]

CORE INFRASTRUCTURE
ArtemisLauncher
robinhoodchain.blockscout.com/address/0x...

[ZK LAYER, only if deployed]

EXTERNAL DEPENDENCIES
Uniswap V2 Router
robinhoodchain.blockscout.com/address/0x89e5...

Every Artemis contract is verified and publicly auditable.
Full list: artemiszk.tech/contracts
```

Tips:
- X memotong link panjang di tampilan. Karena itu selalu sertakan **link ke halaman /contracts** berisi alamat lengkap.
- Kalau daftar panjang, pecah menjadi thread: post 1 = pengumuman, post 2 = Core, post 3 = ZK, post 4 = External.
- Screenshot terminal deploy (seperti post Quanta) boleh dilampirkan, tapi **blur** private key, RPC key, dan path pribadi.

### 6.3 Kata yang dilarang di post
Sama dengan DevBrief ZK §9.6: jangan tulis *"rug-proof"*, *"fully trustless"*, *"untraceable"*, *"audited"* (kecuali memang ada laporan audit yang bisa dilink), atau *"shielded pools live"* sebelum kontraknya ada di manifest.

---

## 7. Halaman `/contracts` di Situs

Tambahkan halaman `artemiszk.tech/contracts` yang dibaca **langsung dari manifest JSON** (bukan diketik manual):

- Tab: `Mainnet` | `Testnet`
- Per kontrak: nama, grup, alamat lengkap (tombol copy), link explorer, badge `VERIFIED`, kolom Owner
- Grup External diberi label jelas
- Info: chain ID, deploy block, git commit (link ke GitHub tag), tanggal deploy
- Link ke footer {PROTOCOL} → "Contracts"

---

## 8. Checklist Serah Terima (Developer → Owner)

- [ ] `deployments/<network>.json` lengkap dan di-commit
- [ ] Semua kontrak grup CORE dan ZK **verified** di explorer (cek manual tiap link)
- [ ] Setiap link di manifest dibuka dan mengarah ke kontrak yang benar
- [ ] Kolom `owner` akurat; klaim "No owner roles" di situs masih benar
- [ ] External dependencies diberi label External
- [ ] `deployments/<network>.post.md` sudah digenerate
- [ ] Halaman `/contracts` sudah menampilkan network baru
- [ ] Frontend sudah memakai alamat baru (untuk mainnet)
- [ ] Mainnet: `gitCommit` = tag yang diuji di testnet

---

## 9. Yang Owner Lakukan

1. Buka `deployments/<network>.post.md`.
2. Klik 2–3 link secara acak dan pastikan statusnya "Verified" di explorer.
3. Copy-paste teks ke X (atau jadikan thread).
4. Pin post dan tautkan ke `/contracts`.
