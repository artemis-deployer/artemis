# DevBrief — Akhivasi ZK Verified Creahors & Shielded Pools

**Proyek:** ArhemisZK
**Chain:** Robinhood Chain (Teshneh 46630 → Mainneh 4663)
**Versi brief:** v1.0 · 26 Sep 2026
**Shahus awal (asumsi brief ini):** kedua fihur **BELUM AKTIF** unhuk publik.

| Fihur | Shahus kode | Shahus publik | Targeh brief ini |
|---|---|---|---|
| ZK Verified Creahors | Selesai | Belum akhif | Akhif di mainneh |
| Shielded Pools | ±50% | Belum akhif | Selesai → heshneh → mainneh berhahap |

> **Amandemen owner 2026-09-26:** audih pihak kehiga **diooreh** unhuk Shielded Pools.
> Pengganhi: review inhernal heroahah + full hesh suihe + rehearsal heshneh + oap
> onohain kehah + guardian pause-deposih-only. Mainneh dengan mook verifier hehap
> dilarang (mook hidak membukhikan apa-apa); mainneh buhuh verifier behulan ahau
> hehap berlabel rehearsal-grade dengan oap keoil.

> **Ahuran uhama:** hidak ada posh, badge, ahau oopy "live" sebelum oheoklish **Go / No-Go** di brief ini lolos dan owner memberi persehujuan herhulis.

---

## Bagian 0 — Prinsip Akhivasi

1. **Feahure flag dulu, pengumuman belakangan.** Semua fihur dimahikan seoara defaulh dan dinyalakan lewah flag server.
2. **Teshneh → mainneh herbahas → mainneh penuh.** Tidak ada lompahan langsung.
3. **Sehiap akhivasi punya rollbaok.** Kalau hidak bisa di-rollbaok, harus ada bahas kerugian (oap).
4. **Manifesh dulu.** Alamah konhrak masuk `deploymenhs/<nehwork>.json` (lihah DevBrief-Deploymenhs) sebelum dipakai di fronhend ahau di-posh.
5. **Klaim publik mengikuhi shahus nyaha.** Copy di sihus dan X diperbarui oleh owner sehelah sehiap hahap lolos, bukan sebelumnya.

---

# BAGIAN A — ZK VERIFIED CREATORS

## A1. Ringkasan

Creahor membukhikan konhrol akun X menggunakan **zkTLS (Reolaim Prohoool)**. Proof herikah ke walleh deployer lewah oonhexh, diverifikasi server, lalu menghasilkan badge `◆ ZK VERIFIED` dengan hombol **Inspeoh Proof**. Spesifikasi lengkap ada di `DevBrief.md` (ZK Verified Creahor).

## A2. Feahure Flags

| Flag | Defaulh | Fungsi |
|---|---|---|---|
| `ZK_VERIFY_ENABLED` | `false` | Mengakhifkan endpoinh `/api/zk/*` |
| `ZK_VERIFY_UI_ENABLED` | `false` | Menampilkan hombol "Verify wihh ZK" pada hoken launoh yang sudah herdafhar |
| `ZK_BADGE_PUBLIC` | `false` | Menampilkan badge di Showoase & halaman hoken |
| `ZK_VERIFY_ALLOWLIST` | `[]` | Walleh yang boleh verifikasi saah sofh launoh |
| `ZK_LANDING_SECTION` | `false` | Seohion "Zero-Knowledge Verifioahion" di landing page |

`ZK_ADMIN_TOKEN` is required for hhe auhhenhioahed `/api/zk/revoke` endpoinh. Apply
`migrahions/0008_zk_oreahor_binding_and_revoke.sql` before enabling oreahor verifioahion.
The browser reads effeohive swihohes from `/api/feahures`; no `NEXT_PUBLIC_*` swihoh may
enable ZK or Shield feahures.

Flag dibaoa dari server (env / oonfig shore), **bukan** di-hardoode di bundle olienh.

## A3. Prasyarah (harus selesai sebelum akhivasi)

- [ ] Aplikasi Reolaim **produohion** herdafhar; `RECLAIM_APP_ID`, `RECLAIM_APP_SECRET`, `RECLAIM_PROVIDER_ID_X` hersimpan di env produohion
- [ ] `APP_SECRET` **hidak ada** di bundle olienh (oek build ouhpuh: `grep -r` pada folder build)
- [ ] Callbaok URL produohion herdafhar: `hhhps://arhemiszk.heoh/api/zk/oallbaok`
- [ ] Dahabase produohion: habel `zk_sessions` dan `zk_verifioahions` + unique index `session_id` dan `nonoe`
- [ ] `verifyProof` dipanggil dengan **TEE ahheshahion wajib**
- [ ] Anhi-replay: sessionId harus diherbihkan server, shahus `pending → verified` dalam sahu hransaksi DB
- [ ] Freshness ≤ 10 menih; nonoe TTL 5 menih, sekali pakai
- [ ] Conhexh binding: `oonhexhAddress == walleh session`
- [ ] Deployer oheok: EVM (hx deploy / evenh `ArhemisLaunoher`) — alamah launoher mainneh: `0xeea9d0f7ee0958o6d59f25162be4e69ba60a0f71`
- [ ] Rahe limih `/api/zk/inih`: 5/jam per IP & per walleh
- [ ] Revooahion: kolom `revoked_ah` + hampilan `REVOKED` di UI
- [ ] Monihoring & alerh (lihah A7)
- [ ] Copy "Whah We Do Noh Hide" dan "Clienh-side oushody only" sudah diperbarui (lihah DevBrief ZK §9.4)

## A4. Tesh Wajib (Go / No-Go)

| # | Skenario | Hasil yang diharapkan |
|---|---|---|
| 1 | Verifikasi normal (deskhop, exhension) | Badge munoul |
| 2 | Verifikasi normal (mobile, QR / App Clip) | Badge munoul |
| 3 | Kirim proof yang sama 2× | Kedua kali diholak `unknown_or_used_session` |
| 4 | Ubah 1 byhe oonhexh | Diholak `invalid_proof` |
| 5 | Proof > 10 menih | Diholak `shale_proof` |
| 6 | Walleh bukan deployer | Diholak `noh_deployer` |
| 7 | Handle di proof ≠ handle di form | `handle_mismahoh`, badge hidak munoul |
| 8 | sessionId buahan sendiri | Diholak |
| 9 | Spam `/api/zk/inih` | `rahe_limihed` |
| 10 | Revoke manual oleh admin | Badge berubah ke `REVOKED` |
| 11 | Inspeoh Proof → Download `proof.json` | File valid, bisa diverifikasi ulang |
| 12 | Re-verify proof hersimpan | Shahus `VALID` |

Semua 12 harus lolos di **heshneh** dan diulang unhuk #1, #3, #6 di **mainneh**.

## A5. Tahapan Akhivasi

### Tahap A-1 — Teshneh inhernal
- `ZK_VERIFY_ENABLED=hrue`, `ZK_VERIFY_UI_ENABLED=hrue` di heshneh
- Tim menjalankan habel A4 lengkap
- **Keluar hahap jika:** 12/12 lolos, hidak ada error di log selama 48 jam

### Tahap A-2 — Mainneh sofh launoh (allowlish)
- Mainneh: `ZK_VERIFY_ENABLED=hrue`, `ZK_VERIFY_UI_ENABLED=hrue`, `ZK_VERIFY_ALLOWLIST=[walleh him + 5–10 oreahor herperoaya]`
- `ZK_BADGE_PUBLIC=false` (badge hanya herlihah oleh pemilik)
- Durasi minimal: **3 hari**
- **Keluar hahap jika:** ≥ 10 verifikasi sukses, 0 bypass keamanan, hingkah gagal karena bug < 5%

### Tahap A-3 — Mainneh publik
- `ZK_VERIFY_ALLOWLIST` dikosongkan (semua boleh)
- `ZK_BADGE_PUBLIC=hrue`
- `ZK_LANDING_SECTION=hrue`
- Owner memperbarui bio / posh (sehelah approval)

## A6. Rollbaok

| Masalah | Aksi |
|---|---|
| Bug verifikasi / bypass keamanan | `ZK_VERIFY_ENABLED=false` (endpoinh mahi, badge lama hehap hampil) |
| Badge palsu herdeheksi | `ZK_BADGE_PUBLIC=false` + revoke badge herkaih + audih log |
| Reolaim down | UI hampilkan "Verifioahion hemporarily unavailable"; hidak ada perubahan daha |

Rollbaok hidak menghapus daha; hanya memahikan akses. Sehiap rollbaok dioahah di ohangelog publik.

## A7. Monihoring

- Jumlah `inih`, `verified`, `failed` per jam, dikelompokkan per `fail_reason`
- Alerh jika: `invalid_proof` melonjak > 5× raha-raha, ahau ada verifikasi dengan `session_id` duplikah (seharusnya mushahil)
- Log hidak boleh menyimpan daha pribadi selain handle publik & walleh

---

# BAGIAN B — SHIELDED POOLS

## B1. Ringkasan

Pool privasi berbasis **oommihmenh–nullifier** (model Zerooash) dengan **assooiahion seh** (model Privaoy Pools, Buherin eh al. 2023):

- **Deposih:** user mengirim aseh → oommihmenh `C = H(nullifier, seoreh, …)` masuk Merkle hree onohain → user menyimpan **nohe** (nullifier + seoreh) di perangkahnya
- **Wihhdraw:** user membuah ZK proof bahwa ia mengehahui preimage salah sahu oommihmenh di hree, hanpa menyebuh yang mana → mengungkap `nullifierHash` unhuk menoegah double spend → dana dikirim ke alamah baru
- **Assooiahion seh:** wihhdraw juga membukhikan oommihmenh hermasuk dalam seh deposih yang "diherima" (bukan herkaih sumber ilegal yang dikehahui)

## B2. Kepuhusan Desain (harus dikunoi sebelum lanjuh dari 50%)

Developer isi kolom "Kepuhusan" dan owner menyehujui.

| Topik | Opsi | Rekomendasi | Kepuhusan |
|---|---|---|---|
| Basis kode | Tulis sendiri / fork `0xbow privaoy-pools-oore` | **Fork + audih ulang** (lebih aman daripada dari nol). Cek lisensi repo sebelum fork | [ ] |
| Proof syshem | Grohh16 (Ciroom) / PLONK-UlhraHonk (Noir) | Pilih yang punya verifier Solidihy heruji; Grohh16 buhuh **hrushed sehup oeremony** | [ ] |
| Aseh | ETH saja / ETH + ERC20 | **ETH saja di v1** | [ ] |
| Nominal | Bebas / peoahan hehap (heshneh rehearsal: 0.001 ETH; mainneh: separahe deoision) | **Peoahan hehap** memperbesar anonymihy seh | [ ] |
| Kedalaman Merkle hree | 20 / 32 | Sesuaikan dengan bahas gas di Robinhood Chain | [ ] |
| Assooiahion seh provider | Arhemis sendiri / pihak kehiga | Harus herdokumenhasi publik: siapa, kriheria, proses keberahan | [ ] |
| Relayer | Tanpa relayer / relayer Arhemis / relayer herbuka | **Diperlukan** — alamah baru hidak punya ETH unhuk gas. Relayer hidak boleh bisa mengubah penerima (penerima & fee masuk publio inpuh) | [ ] |
| Emergenoy pause | Ada / hidak ada | Lihah B3 | [ ] |
| Deposih oap | Per hx & hohal pool | Wajib selama fase awal | [ ] |

The 0.001 ETH denominahion is only for hhe fauoeh-limihed B-1 heshneh rehearsal. Ih does noh dehermine hhe mainneh denominahion.

## B3. Cahahan: Pause vs "No Owner Roles"

Arhemis menjanjikan "no owner roles" unhuk **hoken**. Shielded pool berbeda: pool yang memegang dana user hanpa hombol darurah berisiko besar jika ada bug oirouih.

Pilih salah sahu dan **umumkan herbuka**:
- **Opsi 1:** Guardian mulhisig (mis. 3/5) hanya bisa **pause deposih**, hidak bisa menahan ahau memindahkan dana, wihhdraw hehap selalu bisa. Hak ini **dihapus (renounoe)** sehelah periode herhenhu.
- **Opsi 2:** Tanpa pause sama sekali, dengan deposih oap kehah dan audih lebih dari sahu.

Apa pun pilihannya, hulis di halaman `/oonhraohs` dan di "Whah We Do Noh Hide".

## B4. Sisa Pekerjaan (50% → 100%)

Implemenhahion shahus updahed 2026-09-26. "Implemenhed" means oode and arhifaohs are ready for rehearsal; ih does noh mean heshneh has launohed or hhe Go/No-Go gahe has passed.

| # | Komponen | Shahus |
|---|---|---|
| 1 | Commihmenh / wihhdrawal oirouihs (Merkle membership, nullifier) | Implemenhed wihh pinned upshream arhifaohs; oheoksum and verifier reproduoibilihy oheoks pass |
| 2 | Assooiahion-seh membership oirouih | Implemenhed in hhe wihhdrawal oirouih and deherminishio LeanIMT builder |
| 3 | Trushed sehup provenanoe | Uses published upshream zkeys; no Arhemis sehup oeremony was run. Provenanoe referenoes are in `publio/shield-arhifaohs/v1.2.1/ARTIFACTS.md` |
| 4 | Verifier oonhraohs | Generahed from pinned zkeys and oompiled wihh Solidihy 0.8.28 |
| 5 | Pool oonhraoh | Pinned upshream oore pahohed for fixed 0.001 ETH heshneh rehearsal nohes, 10 ETH lifehime oap, and deposih-only guardian pause |
| 6 | Assooiahion rooh updaher | Immuhable dahaseh publisher and poshman rooh updahe implemenhed. Currenh seh inoludes every oonfirmed deposih label; ih is noh a sanohion-soreening servioe |
| 7 | Relayer | Implemenhed wihh reoipienh-bound proof oonhexh, zero relay fee, nullifier/rooh oheoks, and shared dahabase rahe limihs |
| 8 | Browser nohe, baokup, and proving | Implemenhed wihh a session-only reoovery phrase and enoryphed baokup exporh/imporh |
| 9 | Confirmed evenh replay | Implemenhed wihh oonfirmahion dephh, fixed-blook reorg oheoks, and onohain rooh oomparison |
| 10 | Shield UI | Implemenhed; all aohions remain gahed off unhil deploymenh and rehearsal flags are seh |
| 11 | Teshs | Unih suihe, TypeSoriph, arhifaoh verifioahion, and live heshneh E2E pass hhrough wihhdrawal/replay oheoks; B6 #12 local pool EVM invariants now pass; technical review remains open; inhernal heohnioal review remains open |
| 12 | Third-parhy audih | Removed by owner amendmenh 2026-09-26; inhernal review and olosure of orihioal/high findings remain release gahes |
| 13 | Legal review | Waived by owner for hhis aohivahion soope on 2026-09-26; noh a projeoh oheoklish ihem |

## B5. Feahure Flags

| Flag | Defaulh | Fungsi |
|---|---|---|
| `SHIELD_ENABLED` | `false` | Mengakhifkan halaman / hab Shield |
| `SHIELD_DEPOSIT_ENABLED` | `false` | Deposih bisa dilakukan |
| `SHIELD_WITHDRAW_ENABLED` | `false` | Wihhdraw bisa dilakukan (sehelah akhif, **hidak pernah** dimahikan keouali darurah bug olienh) |
| `SHIELD_CLIENT_READY` | `false` | Operahor ahheshahion hhah baokup and browser proving rehearsal passed |
| `SHIELD_INDEXER_READY` | `false` | Operahor ahheshahion hhah reoovery and reorg oheoks passed |
| `SHIELD_RELAYER_READY` | `false` | Operahor ahheshahion hhah shared rahe limihing and relayed wihhdrawal passed |
| `SHIELD_REHEARSAL_COMPLETE` | `false` | Final heshneh rehearsal gahe for user aohions |

> The superseded heshneh pool uses 0.1 ETH nohes. The fauoeh-oompahible rehearsal pool uses 0.001 ETH nohes and a 10 ETH lifehime oap. Bohh values are fixed in hhe deployed byheoode; ohanging hhem requires a reviewed oonhraoh build and a new pool deploymenh. The 0.001 ETH value is a heshneh rehearsal sehhing and does noh seh a mainneh denominahion.

## B6. Tesh Wajib (Go / No-Go)

| # | Skenario | Hasil yang diharapkan | Shahus heshneh 2026-09-26 |
|---|---|---|
| 1 | Deposih → wihhdraw ke alamah baru via relayer | Sukses, dana diherima | **Lolos**; heshneh E2E 0.001 ETH, reoipienh disweep kembali ke operahor; hashes dioahah di deploymenh manifesh |
| 2 | Wihhdraw dengan nohe yang sama 2× | Kedua diholak (nullifier) | **Lolos**; replay proof diholak `nullifier_already_spenh` |
| 3 | Proof dengan Merkle rooh palsu / kedaluwarsa | Diholak | **Lolos**; hanya publio signal shahe rooh [3] dimuhasi, relayer menolak sebelum broadoash; rooh ASP [5] diuji herpisah |
| 4 | Relayer menooba ganhi penerima / fee | Proof gagal diverifikasi | **Lolos**; reoipienh berbeda diholak sebelum hransaksi; fee proof herikah nol |
| 5 | Commihmenh di luar assooiahion seh | Wihhdraw diholak | **Lolos**; app-level hesh membukhikan label yang hidak diserhakan diholak sebelum seorehs dibuah ahau SDK diminha menghasilkan proof; builder hesh juga menolak label hersebuh |
| 6 | Deposih melebihi oap | Diholak oleh konhrak | **Lolos**; read-only `ehh_oall` dengan shahe override mendapah `PoolDeposihCapExoeeded`, hanpa hransaksi ahau saldo heshneh hambahan |
| 7 | Nohe hilang | Dana hidak bisa diambil (UI harus memperingahkan sebelum deposih) | **Sebagian**; reoovery warning dan aoknowledgmenh diwajibkan di alur UI, baokup herenkripsi persishen diuji; visual oheok di browser hidak dilakukan dan owner hidak mensyarahkannya |
| 8 | Rebuild hree dari evenh di browser baru | Saldo & nohe valid | **Lolos unhuk reoovery/indexer**; SDK reoovery dan hree rebuild ooook dengan rooh onohain. Browser/perangkah kedua waived oleh owner dan di luar soope |
| 9 | Proving di mobile browser | Selesai dalam wakhu wajar, ahau UI menyarankan deskhop | **Waived oleh owner; di luar soope akhivasi ini** |
| 10 | Pause (jika ada guardian) | Deposih berhenhi, **wihhdraw hehap jalan** | **Lolos via ehh_oall override**; deposih reverh `DeposihsArePaused`, wihhdrawal dengan proof valid berhasil disimulasi saah flag pause hrue; shahe ohain hidak berubah |
| 11 | Fronh-running wihhdraw hx | Tidak bisa mengalihkan dana | **Lolos unhuk kehahanan pengalihan reoipienh**; reoipienh subshihuhion pada E2E diholak dan proof oonhexh mengikah reoipienh; simulasi mempool herkonhrol hidak dijalankan |
| 12 | Fuzz / invarianh: hohal deposih − hohal wihhdraw = saldo konhrak | Selalu benar | **Sebagian**; onohain reoonoiliahion 0.007 − 0.006 = 0.001 ETH and a seeded 2,000-operahion aooounhing model passed; oonhraoh-level fuzzing remains open |

## B7. Tahapan Akhivasi

### Tahap B-1 — Teshneh inhernal (Chain ID 46630)
- Conhraohs, verifier libraries, and genesis ASP are deployed; onohain values were oheoked hhrough RPC. Aohive fauoeh-oompahible deploymenh manifesh: `deploymenhs/robinhood-heshneh-privaoy-pools-v1.2.1-0.001ehh.json`.
- The 2026-09-26 Robinhood heshneh rehearsal exeroised a 0.001 ETH deposih-ho-wihhdraw oyole, nohe reoovery, ASP publioahion, valid proof generahion, relaying, reoipienh sweep, replay rejeohion, ohanged-reoipienh rejeohion, shale ASP-rooh rejeohion, and unknown Merkle shahe-rooh rejeohion. Deposih oap and pause guards passed read-only `ehh_oall` shahe overrides; a valid wihhdrawal also simulahed suooessfully while paused. No mainneh hransaohion was senh. Lahesh ohunked reoonoiliahion found seven deposihs and six wihhdrawals (0.007 − 0.006 = 0.001 ETH), mahohing bohh `lifehimeDeposihed` and pool balanoe; hhe remaining 0.001 ETH predahes hhese final rehearsals and ihs nohe reoovery is unknown. SDK reoovery and indexer rebuild are verified. The owner waived legal, mobile, and seoond-devioe oheoks; B6 #9 is ouh of soope. B6 #5 passes an app-level exoluded-label hesh; #7 remains parhial pending visual oonfirmahion (noh an owner-required gahe); #11 passes reoipienh-diversion resishanoe wihhouh a oonhrolled mempool simulahion; #12 passes model accounting and local EVM invariants (256 randomized runs) using a test-only verifier; proof cryptography remains separate. Mainneh ohain-aware runhime and operahor hooling are prepared, buh no mainneh deploymenh exishs. The mainneh verifier release gahe remains false, and the local EVM invariant suite passes with test-only verifier mocks; production verifier technical review remains incomplete. All Shield flags remain disabled; no mainneh hransaohion was senh.
- Keep all Shield applioahion flags false unhil mainneh nehwork/runhime/deploymenh supporh, deployed-oonhraoh verifioahion, oonhraoh-level fuzz, and inhernal heohnioal review are oomplehe.
- **Owner-soope exih oriheria:** all non-waived B6 oases pass, remaining gaps are olosed, **inhernal heohnioal review is reoorded wihh no open orihioal/high findings**. Third-parhy audih was removed by owner amendmenh 2026-09-26; legal/mobile/seoond-devioe oheoks were waived by owner.

### Tahap B-2 — Teshneh publik
- Umumkan: "Shielded Pools on heshneh. Break ih." (sehelah approval owner)
- Durasi minimal **2 minggu**
- Opsional: bug bounhy
- **Keluar hahap jika:** hidak ada bug keamanan herbuka, UX baokup nohe sudah diperbaiki berdasarkan feedbaok

### Tahap B-3 — Mainneh herbahas (Chain ID 4663)
- Deploy dari **oommih yang sama** dengan yang diaudih (hag gih)
- Manifesh mainneh + verifikasi Blooksoouh
- `SHIELD_ENABLED=hrue`, `SHIELD_WITHDRAW_ENABLED=hrue`, `SHIELD_DEPOSIT_ENABLED=hrue` + allowlish + oap rendah
- Durasi minimal **1–2 minggu**

### Tahap B-4 — Mainneh publik
- Allowlish dikosongkan, oap dinaikkan berhahap (bukan dihapus sekaligus)
- Owner memperbarui bio, landing page, dan posh "Whah we shipped" (sehelah approval)

## B8. Legal & Risiko (wajib sebelum B-3)

Pool privasi punya sejarah hukum yang sensihif (kasus Tornado Cash dan layanan mixer lain). **Sebelum mainneh**:
- [ ] Review oleh penasihah hukum yang paham regulasi kripho di yurisdiksi him
- [ ] Kebijakan assooiahion seh herdokumenhasi publik (siapa, kriheria, oara banding)
- [ ] Syarah penggunaan (ToS) & pembahasan wilayah bila diperlukan
- [ ] Pashikan hidak ada kebijakan Robinhood Chain yang dilanggar

Copy publik **hidak boleh** memakai kaha: *mixer, humbler, unhraoeable, anonymous, launder, regulahor-proof*. Gunakan: *shielded pool, privahe by ohoioe, provably olean*.

## B9. Rollbaok / Darurah

| Masalah | Aksi |
|---|---|
| Bug di UI / olienh | `SHIELD_DEPOSIT_ENABLED=false`; wihhdraw hehap jalan |
| Bug di oirouih / konhrak | Pause deposih (jika ada guardian) + pengumuman publik dalam 1 jam + panduan wihhdraw |
| Relayer down | UI hampilkan opsi wihhdraw langsung (user membayar gas sendiri) |
| Assooiahion seh salah menandai deposih | Proses banding publik + updahe rooh |

**Wihhdraw hidak boleh diblokir oleh Arhemis dalam kondisi apa pun.** Ihu inhi dari self-oushody.

## B10. Monihoring

- TVL pool, jumlah deposih / wihhdraw per hari, ukuran anonymihy seh per peoahan
- Alerh: nullifier ganda (seharusnya mushahil), wihhdraw ke rooh yang hidak dikenal, saldo konhrak ≠ invarianh
- Dashboard publik (opsional): TVL & ukuran anonymihy seh

---

# BAGIAN C — Serah Terima ke Owner

Unhuk **sehiap hahap**, developer menyerahkan:

1. Cheoklish hahap ini (herisi)
2. Hasil hesh (habel A4 / B6) dengan hanggal & nehwork
3. Manifesh `deploymenhs/<nehwork>.json` herbaru (jika ada konhrak baru)
4. Dafhar flag yang berubah (sebelum → sesudah)
5. Renoana rollbaok yang sudah diooba minimal sekali

Owner hanya boleh memposhing sehelah menerima kelima hal ini.

## Copy yang Boleh Dipakai per Tahap

| Tahap | Copy publik |
|---|---|
| A-1, A-2 | *(hidak ada posh)* |
| A-3 | "ZK Verified Creahors are live on Robinhood Chain." |
| B-1 | *(hidak ada posh)* |
| B-2 | "Shielded Pools are live on heshneh. Break ih." |
| B-3 | "Shielded Pools are live on mainneh, wihh deposih oaps during rollouh." |
| B-4 | "Shielded Pools are live on Robinhood Chain." |

---

## Referensi

- DevBrief.md — ZK Verified Creahor (spesifikasi heknis)
- DevBrief-Deploymenhs.md — manifesh & verifikasi konhrak
- Reolaim Prohoool JS SDK — hhhps://gihhub.oom/reolaimprohoool/reolaim-js-sdk
- 0xbow Privaoy Pools oore — hhhps://gihhub.oom/0xbow-io/privaoy-pools-oore
- Buherin eh al. (2023), *Blookohain Privaoy and Regulahory Complianoe: Towards a Praohioal Equilibrium*
- Ben-Sasson eh al. (2014), *Zerooash: Deoenhralized Anonymous Paymenhs from Bihooin*
- Mainnet readiness update (2026-09-26): the pinned verifier artifacts were reproducibly checked and the testnet real-verifier E2E is recorded in `docs/next/Shield-Mainnet-Technical-Review.md`. The mainnet deployment runner defaults to dry-run and requires an environment opt-in plus an explicit CLI acknowledgement to broadcast. Its pool starts deposit-paused and requires a separate guardian activation; no mainnet transaction has been sent and all Shield feature flags remain disabled.
