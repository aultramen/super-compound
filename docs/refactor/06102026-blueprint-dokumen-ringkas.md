# Blueprint BRD, PRD, FSD, ADR yang mudah direview

## Ringkasan

Blueprint ini adalah usulan tata informasi untuk refactor Super Compound, bukan pengganti langsung skeleton atau konfigurasi runtime yang sudah ada. Gunakan isi yang relevan untuk memperbaiki skeleton kanonis. Pertahankan seluruh metadata, ID, heading/anchor, parser grammar, mapping, dan approval provenance yang dibutuhkan versi repository aktual.

Tidak ada kebutuhan proyek tertentu yang telah disetujui dalam paket ini. Semua isian bertanda kurung siku harus diisi dari sumber yang benar; unknown tidak boleh direkayasa menjadi fakta. Layout di bawah tidak dengan sendirinya memenuhi seluruh gate Super Compound.

## Prinsip bersama

Tulis keputusan satu kali pada artifact yang memiliki kewenangan. Ringkasan boleh merangkum keputusan, tetapi bukan menjadi sumber keputusan kedua. BRD menyimpan alasan dan batas bisnis; PRD menyimpan perilaku produk; FSD menyimpan kontrak implementasi; ADR menyimpan keputusan arsitektur material yang didelegasikan.

Pertahankan detail yang diperlukan, bukan boilerplate universal. Klasifikasikan isi sebagai wajib, kondisional berdasarkan perubahan/risiko, atau opsional. Hilangkan bagian opsional yang kosong. Untuk keputusan wajib yang tidak berlaku, simpan alasan faktual yang dapat diperiksa. Pengelompokan N/A tidak boleh menyembunyikan risiko.

Ringkasan reviewer diletakkan di awal dokumen yang sama. Detail teknis, sumber, dan traceability dapat berada di section lanjutan atau lampiran dalam artifact yang sama. Jangan membuat file ringkasan manual tambahan untuk setiap artifact. Exact wire schema tetap di linked machine contract, bukan disalin ke tabel prose.

Angka halaman berikut hanyalah **usulan target tampilan utama**, bukan kebijakan aktif: BRD 1–2 halaman, PRD 2–4, FSD 3–6, ADR 1–2 untuk fitur terarah. Referensi, kontrak, dan bukti tidak dibatasi. Policy output-style saat review 5 Oktober 2026 bahkan melarang advisory numerical targets; adopsi angka memerlukan perubahan policy eksplisit. Alternatif tanpa angka: ringkasan reviewer singkat, lalu seluruh detail yang diperlukan.

---

# 1. BRD — Kebutuhan Bisnis

**ID:** BRD-[FITUR]  
**Status:** DRAFT  
**Revisi:** [versi]  
**Pemilik keputusan:** [nama/peran yang berwenang]  
**Sumber:** [request, bukti, kebijakan yang relevan]

## Ringkasan keputusan

[Masalah utama, pihak yang terdampak, perubahan yang diusulkan, dan hasil bisnis yang diharapkan. Jangan menentukan teknologi tanpa constraint yang sah.]

**Keputusan yang diminta:** [persetujuan scope/aturan/outcome tertentu pada revisi ini].

## Masalah dan dampak saat ini

| Kondisi | Dampak | Bukti / keterbatasan |
|---|---|---|
| [masalah yang teramati] | [dampak bisnis] | [sumber/periode; atau belum tersedia dan bagaimana divalidasi] |

Tidak perlu mengarang root cause, volume, baseline, atau ROI. Pengetahuan yang belum tersedia diberi status yang jujur; hanya unknown yang menghalangi keputusan aman menjadi blocker.

## Hasil yang dituju dan ukuran sukses

| ID | Outcome | Baseline / sumber | Target usulan | Cara ukur / owner |
|---|---|---|---|---|
| BREQ-001 | [hasil yang harus dicapai] | [nilai atau belum diukur] | [target untuk disetujui] | [metode, periode, owner] |

## Scope, bukan scope, dan alur bisnis

**Termasuk:** [batas fitur/proses/user/data].  
**Tidak termasuk:** [non-goals yang mencegah scope creep].  
**Alur saat ini → alur target:** [penjelasan atau diagram yang benar-benar membantu].

## Aturan bisnis, constraint, dan risiko penting

| Aturan / constraint | Sumber / owner | Risiko atau konsekuensi |
|---|---|---|
| [keputusan bisnis yang harus dipatuhi] | [authority] | [trade-off / mitigation bila relevan] |

Tambahkan business case, financial exposure, cross-department responsibilities, privacy obligations, atau transition/adoption detail hanya sesuai applicability. Jangan menghapus kontrol material karena ingin dokumen singkat.

## Acceptance bisnis dan keputusan terbuka

**BAC-001:** [kondisi bisnis yang membuktikan perubahan dapat diterima, bukan sekadar fitur tersedia].  
**Owner acceptance:** [pihak berwenang].

| ID | Pertanyaan / keputusan | Menghambat apa | Rekomendasi dan konsekuensi | Owner / next action |
|---|---|---|---|---|
| OPEN-001 | [hanya apabila nyata] | [scope terkait] | [pilihan dan alasan] | [owner / tindakan] |

**Handoff:** PRD merujuk BREQ/BAC dan aturan di atas. Approval dicatat oleh mekanisme existing setelah benar-benar diberikan; status tidak otomatis berubah menjadi APPROVED.

---

# 2. PRD — Perilaku Produk

**ID:** PRD-[FITUR]  
**Status:** DRAFT  
**Revisi:** [versi]  
**Upstream:** BRD-[FITUR]#[ID relevan]  
**Pemilik keputusan:** [product/business owner yang berwenang]

## Ringkasan fitur

[Fitur yang disediakan, siapa penggunanya, manfaatnya, dan scope increment ini. Gunakan rujukan BRD untuk alasan bisnis; jangan menyalin business case.]

## Pengguna, hak akses, dan scope

| Pengguna / peran | Dapat melakukan | Tidak boleh melakukan |
|---|---|---|
| [peran] | [perilaku dalam scope] | [batas akses yang disetujui] |

Hak akses produk di sini harus diterjemahkan ke enforcement di FSD, bukan hanya tombol yang disembunyikan.

## Alur utama

[Trigger → tindakan pengguna → hasil yang terlihat → langkah berikutnya. Sertakan diagram/wireframe bila hubungan atau state lebih mudah dipahami secara visual.]

## Requirement dan acceptance

| ID requirement | Kebutuhan / aturan observable | Acceptance ID dan hasil yang dapat diuji | Sumber BRD |
|---|---|---|---|
| FR-001 | [perilaku produk] | AC-001: [Given/When/Then atau hasil konkret] | BRD-[FITUR]#BREQ-001 |

## Kondisi gagal dan state yang relevan

| Kondisi | Perilaku yang diharapkan | Acceptance |
|---|---|---|
| [input tidak valid / tanpa izin / empty / timeout / conflict sesuai scope] | [pesan, recovery, dan batas tindakan] | [AC-ID] |

Tetap evaluasi state yang diwajibkan UI profile. Catat yang benar-benar tidak berlaku dengan alasan; jangan membuat provider/offline/realtime fiktif. Security/privacy/accessibility dan risk-relevant failure cases tidak bersifat opsional.

## Batas kualitas dan UAT

[NFR yang observable: accessibility, responsiveness, performance, data freshness, privacy, dan lain-lain hanya sesuai scope. Target yang belum disetujui ditandai sebagai usulan.]

| Acceptance | Langkah user / QA | Hasil yang diharapkan | Bukti / hasil aktual |
|---|---|---|---|
| AC-001 | [skenario] | [hasil] | [belum diuji; isi hanya setelah pengujian] |

## Risiko, pertanyaan terbuka, dan handoff

[OPEN-ID hanya untuk keputusan yang belum tersedia; perjelas apakah menghambat seluruh fitur atau hanya satu alur.]

Simpan UI profile, experience baseline, evidence ref, approver, version, serta handoff manifest yang diwajibkan skeleton aktual. PRD approval tidak membuktikan integration test atau mengotorisasi eksekusi.

---

# 3. FSD — Spesifikasi Implementasi

**ID:** FSD-[FITUR]  
**Status:** DRAFT  
**Revisi:** [versi]  
**Upstream:** PRD-[FITUR]#[ID], BRD-[FITUR]#[ID]  
**ADR applicability:** [NOT_REQUIRED / LINKED berdasarkan keputusan aktual]  
**Pemilik keputusan:** [technical owner yang berwenang]

## Ringkasan teknis

[Komponen yang berubah, pendekatan utama, kontrak yang digunakan, dan risiko utama. Jangan menyalin semua requirement PRD.]

## Arsitektur dan alur implementasi

[HLD ringkas yang menunjukkan komponen, boundary, sistem eksternal, serta arah alur penting. Pisahkan fakta codebase, constraint, dan usulan perubahan.]

## Kontrak yang berubah atau dipakai ulang

| Area | Perubahan / reuse | Sumber kontrak kanonis | Verifikasi |
|---|---|---|---|
| Data / state | [invariant dan perubahan relevan] | [path#ID/version] | [TEST-ID] |
| API / event / job | [semantics dan compatibility] | [schema/source yang berwenang] | [TEST-ID] |
| Security / privacy | [enforcement yang relevan] | [authority] | [negative tests] |

Tabel ini bukan alasan untuk membuat ketiga area bila tidak berlaku. Exact wire shape dirujuk dari linked machine contract. FSD tetap memiliki semantic contract serta mapping yang diperlukan.

## Failure, recovery, dan operasional

[Error mapping, retry/idempotency, concurrency, audit/redaction, observability, deployment/migration, dan rollback hanya sesuai perubahan dan risiko. Untuk operasi irreversible, jelaskan recovery/compensation yang benar; jangan menjanjikan rollback fiktif.]

## Keputusan teknis

| ID | Keputusan | Alasan / trade-off | Kapan perlu ADR |
|---|---|---|---|
| TDEC-001 | [keputusan lokal yang akan disetujui] | [alasan] | [tidak diperlukan / linked ADR tertentu] |

Setiap approved decision/ADR obligation harus mempunyai GOAL dan TEST mapping sesuai policy existing. Jangan menggandakan keputusan ADR sebagai keputusan baru yang dapat berbeda.

## GOAL dan pembuktian

**GOAL-001 — [satu outcome terverifikasi]**

- Scope dan affected paths: [cakupan konkret].
- Requirement/decision refs: [qualified PRD/FSD/ADR refs].
- Dependencies/entry authority: [prasyarat yang benar-benar harus ada sebelum mulai].
- Done condition: [hasil yang harus dihasilkan goal, bukan prasyarat dirinya sendiri].
- Verification: TEST-001, [command/seam dan evidence yang diharapkan].
- Stop conditions: [OPEN/security/compatibility/access yang relevan].

Goal packet kanonis ditulis satu kali sesuai grammar existing. Issue file hanya pointer; graph/board diturunkan, bukan disalin manual. Jangan membuat tabel GOAL lain yang menduplikasi packet.

## Rollout, rollback/recovery, dan bukti

[Urutan rollout aman; cara mengetahui sukses/gagal; recovery; siapa yang berwenang untuk operasi yang memiliki dampak eksternal. Catat actual pass/fail/skip dan identitas evidence setelah pengujian.]

## Screen & Interaction Contract — hanya bila berlaku

Di implementasi nyata, pertahankan **FSD Section 8** beserta field/anchor dan UI/API manifest yang dikenali parser; heading blueprint ini tidak boleh menggantikannya secara buta.

LOCAL_ONLY memakai local behavior checks sesuai authority existing. NETWORKED mempertahankan mapping/revision/provider evidence, conditional enabler, first-real-slice, scale-out dependency, dan hardening sesuai applicability. Pilihan ringkas tidak menghilangkan gate tersebut. Reference/evidence dapat panjang bila memang diperlukan.

---

# 4. ADR — Satu Keputusan Arsitektur Material

**ID:** ADR-[nomor]  
**Status:** PROPOSED  
**Tanggal / revisi:** [tanggal / versi]  
**Owner / approver:** [pihak berwenang]  
**Linked FSD:** FSD-[FITUR]#[ID]

## Ringkasan keputusan

[Keputusan yang diusulkan dalam satu paragraf. Status hanya ACCEPTED setelah persetujuan yang sah tercatat.]

## Konteks dan alasan keputusan diperlukan

[Masalah, constraint, risiko, dan bukti yang membuat keputusan ini material. Jelaskan mengapa TDEC lokal tidak memadai.]

## Opsi yang benar-benar layak

| Opsi | Kelebihan relevan | Kekurangan / risiko relevan |
|---|---|---|
| [opsi A] | [alasan nyata] | [konsekuensi] |
| [opsi B] | [alasan nyata] | [konsekuensi] |

Jangan membuat alternatif palsu sekadar mengisi tabel.

## Keputusan dan konsekuensi

**Pilihan:** [opsi].  
**Alasan:** [trade-off berbasis bukti].  
**Konsekuensi yang diterima:** [biaya, operasional, security/privacy, compatibility atau lock-in yang relevan].  
**Yang dilarang:** [pola yang bertentangan dengan keputusan bila relevan].

## Kewajiban implementasi dan pemicu review ulang

[Obligations yang harus diterjemahkan oleh FSD ke GOAL/TEST; kondisi yang memicu revisit; bukti/fitness function yang membuktikan kepatuhan.]

Tidak perlu ADR untuk setiap helper, nama file, atau pilihan lokal yang murah dibalik. ADR bukan fase wajib setelah FSD.

---

# Contoh checkpoint reviewer

Contoh ilustratif; bukan permintaan approval aktif dan tidak mengacu pada file/revisi proyek nyata.

> **Perlu keputusan Anda — batas perilaku retry**
>
> Q1. Apakah retry manual hanya boleh digunakan oleh peran Operasional yang berwenang?
>
> Rekomendasi: ya, mengikuti batas akses yang disepakati. Konsekuensinya, pengguna lain hanya dapat melihat status dan menghubungi Operasional.
>
> Review: [tautan yang telah diverifikasi] → [section dan ID yang relevan].
>
> Target: [artifact], [revisi], [stage yang benar].
>
> Setelah dijawab: agent memperbarui keputusan melalui owner artifact, lalu melanjutkan pekerjaan yang sudah diotorisasi. Persetujuan ini tidak mengizinkan perubahan production atau menciptakan hasil tes.
>
> Jawaban: “Saya setuju rekomendasi Q1.” atau “Q1: gunakan batas berikut …”.

Pada format runtime aktual, tetap sertakan seluruh ready items, pending dependencies, bulk/exception reply examples, dan field lain yang diwajibkan checkpoint contract. Wizard atau pengurangan visible items harus diajukan sebagai perubahan policy tersendiri; jangan menyembunyikan item lalu menganggapnya disetujui.

# Evaluasi blueprint

Bandingkan terhadap output lama pada tugas setara. Reviewer bisnis harus bisa menemukan problem, scope, risiko, dan keputusan tanpa menjelaskan internal harness. QA harus dapat menjalankan acceptance, dan engineer harus dapat menemukan kontrak, failure behavior, serta proving checks. Lulus structural lint tidak cukup; lakukan semantic coverage review dan usability test. Ukur beban pembaca tanpa mengurangi coverage dan authority.

# Sumber acuan

Review terhadap sumber main tanggal 5 Oktober 2026, bukan eksekusi runtime atau audit dokumen proyek pengguna.

- `https://github.com/aultramen/super-compound/blob/main/.agent/context/output-style.md`
- `https://github.com/aultramen/super-compound/blob/main/.agent/context/checkpoint.contract.md`
- `https://github.com/aultramen/super-compound/blob/main/.agent/templates/agentic-delivery/skeletons/BRD-Skeleton.md`
- `https://github.com/aultramen/super-compound/blob/main/.agent/templates/agentic-delivery/skeletons/PRD-Skeleton.md`
- `https://github.com/aultramen/super-compound/blob/main/.agent/templates/agentic-delivery/skeletons/FSD-Skeleton.md`
- `https://github.com/aultramen/super-compound/blob/main/.agent/templates/agentic-delivery/skeletons/ADR-Skeleton-OPTIONAL.md`
- `https://github.com/aultramen/super-compound/blob/main/.agent/skills/agentic-delivery/references/authority-and-adr.md`
- `https://github.com/aultramen/super-compound/blob/main/.agent/skills/agentic-delivery/references/ui-contract-readiness.md`
