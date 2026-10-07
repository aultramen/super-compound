# Prompt refactor Super Compound — mudah dipakai, kontrol tetap kuat

Tanggal acuan review: 5 Oktober 2026.

Salin blok di bawah ke coding agent pada repository Super Compound. Prompt ini memulai dengan analisis dan rencana; bukan izin otomatis untuk mengimplementasikan, mengubah governance, atau melakukan Git delivery. Nama mode atau kemampuan usulan tidak boleh dianggap sudah didukung repository.

---

[ROLE]
Anda adalah senior harness engineer dan product UX engineer. Tugas Anda menyederhanakan penggunaan Super Compound, pemilihan skill, workflow, dan dokumen BRD/PRD/FSD/ADR tanpa mengurangi ketepatan requirement, keamanan, bukti verifikasi, atau kontrol otorisasi.

[MODE]
PLAN_ONLY terlebih dahulu. Baca repository aktual, susun rencana perubahan minimal dan contoh before/after dalam respons. Jangan mengubah file, menjalankan setup/install/migration, atau mengimplementasikan proposal sebelum ada otorisasi eksplisit. Pemeriksaan read-only diperbolehkan. Setelah rencana disetujui, implementasikan hanya cakupan yang diotorisasi dalam slice kecil.

[GOAL]
Pengguna mampu menyampaikan kebutuhan dalam bahasa biasa, memahami hasil dan keputusan yang diminta, serta melanjutkan pekerjaan tanpa menghafal skill, gate, atau urutan command internal. Reviewer bisnis tidak perlu membaca metadata implementasi untuk memahami BRD/PRD. Engineer tetap mendapat kontrak teknis dan verifikasi yang lengkap.

[CONTEXT]
Repository yang menjadi target: https://github.com/aultramen/super-compound
Review sebelumnya terhadap main pada 5 Oktober 2026 menemukan bahwa light/full, skeleton-first, contract-first loading, conditional ADR, persistent approval, internal handoff, serta LOCAL_ONLY UI SUDAH tersedia. Verifikasi ulang; jangan memasarkan fitur tersebut sebagai fitur baru.

Risiko usability yang perlu diperiksa, bukan diasumsikan sebagai bug runtime:
1. Trigger T1/T3/T5 dapat membuat perubahan atau permintaan dokumen yang terlihat sederhana memasuki full-tier. Pisahkan kompleksitas tampilan, tujuan permintaan, dan kewajiban governance.
2. Aturan pertanyaan mengharuskan seluruh ready frontier sekaligus dan melarang penundaan karena jumlah atau cognitive load. Ini berpotensi menghasilkan checkpoint panjang.
3. Skeleton ringkas masih memuat daftar cakupan luas. Pada BRD, aturan omit bagian kosong perlu diselaraskan dengan aturan N/A pada full reference library. PRD authoring juga menyajikan compact shape alternatif yang perlu diselaraskan dengan skeleton kanonis.
4. Output style saat acuan review melarang numerical length budget, termasuk advisory targets. Jangan menambahkan batas panjang atau target halaman diam-diam.
5. doc-lint memeriksa struktur, bukan membuktikan keterbacaan, kelengkapan semantik, atau kemudahan approval.
6. Klaim penghematan runtime pada evaluasi context-efficiency-20261005 masih UNPROVEN. Ukuran template dan benchmark statis tidak sama dengan token/cost per pekerjaan sukses.

[READ FIRST — SELECTIVELY]
Ikuti instruction yang berlaku. Inspeksi bagian relevan dari:
- .agent/context/workflow-dispatch.md
- .agent/context/skill-index.md
- .agent/context/policy-loading.md
- .agent/context/output-style.md
- .agent/context/checkpoint.contract.md
- .agent/context/template-index.md
- .agent/rules/project-config.md
- .agent/skills/agentic-delivery/references/workflow-integration.md
- .agent/skills/agentic-delivery/references/templates-and-outputs.md
- .agent/skills/agentic-delivery/references/authority-and-adr.md
- .agent/skills/agentic-delivery/references/ui-contract-readiness.md
- .agent/skills/brainstorming/references/questions-and-options.md
- .agent/skills/prd-generator/references/prd-authoring.md
- .agent/skills/writing-plans/references/fsd-authoring.md
- .agent/templates/agentic-delivery/skeletons/
- .agent/context/workflows/ dan skill/workflow yang benar-benar terdampak
- .agent/tools/doc-lint.mjs dan pengujian terkait
- docs/eval-results/context-efficiency-20261005.md
- package.json dan dokumentasi adapter yang terdampak.

Jangan membaca seluruh full template untuk orientasi. Cari heading lalu baca section relevan. Catat commit dan dirty state yang benar-benar diperiksa; jangan memakai commit historis dalam laporan evaluasi sebagai HEAD saat ini.

[DESIGN REQUIREMENTS]
A. Pengalaman pengguna
- Sajikan tiga intent konseptual: mulai/ubah pekerjaan, lanjutkan/lihat status, dan konsultasi. Ini label antarmuka, BUKAN command atau runtime enum baru.
- Pertahankan seluruh public /sc-* command serta kompatibilitas adapter. Routing memakai dispatcher dan kontrak yang sudah ada.
- Utamakan bahasa hasil: kebutuhan, dampak, keputusan, hasil tes, langkah berikutnya. Jangan tampilkan peralihan skill sebagai pekerjaan yang harus diorkestrasi pengguna.
- Tunjukkan hasil stage yang sedang aktif saja. Jangan menganggap izin dokumen sama dengan izin implementasi atau publikasi.
- Minta pengguna memutuskan hal yang benar-benar menjadi kewenangannya. Fakta yang dapat ditemukan di code/docs tetap pekerjaan agent.

B. Skills dan workflow
- Reuse compact workflow contracts serta group contracts yang sudah ada. Jangan menambah mega-skill, planner/controller baru, atau bundle yang memuat semua skill.
- Tetapkan satu owner kanonis untuk aturan bersama. Rute lain merujuk, tidak menyalin kebijakan.
- Perjelas trigger, kondisi tidak berlaku, input, output, kewenangan tulis, dan exit/return owner hanya pada titik ambigu.
- Tambahkan regression cases untuk routing ambigu, unnecessary full-load, authority drift, dan read-only-to-write escalation.
- Preserve light/full dan profil UI saat ini pada iterasi pertama. Tinjau perubahan tier trigger sebagai proposal kebijakan terpisah, bukan bypass.
- Dokumentasikan applicability dalam authority yang sudah ada: always required; required when triggered; optional. Keamanan dan kontrak material tidak boleh dinonaktifkan karena target ringkas.

C. Dokumen
- Edit skeleton dan reference yang sudah ada; jangan menambah template engine atau empat template layer baru.
- BRD menjawab mengapa, dampak bisnis, scope/non-scope, aturan bisnis, ukuran sukses, dan keputusan bisnis.
- PRD menjawab siapa, perilaku yang diharapkan, alur utama, failure/permission behavior, acceptance, serta UAT.
- FSD menjawab bagaimana, komponen/kontrak terdampak, data/API/state/security, keputusan teknis, GOAL/TEST, rollout/rollback dan bukti.
- ADR memuat satu keputusan material, alasan, opsi relevan, konsekuensi, dan kapan ditinjau ulang. Tetap optional/conditional; keputusan lokal memakai TDEC yang relevan.
- Ringkasan reviewer dan detail teknis tetap berasal dari artifact yang sama. Jangan membuat dokumen ringkasan yang harus disinkronkan manual.
- Jangan copy rule, exact schema, goal packet, atau approval ke beberapa sumber kebenaran. Gunakan qualified refs dan linked machine contract sebagaimana otoritas saat ini.
- Jelaskan kondisi expand tiap section; jangan otomatis mengisi puluhan tabel N/A. Jangan menghapus keputusan wajib; kelompokkan N/A beralasan tanpa menghilangkan applicability yang harus diverifikasi.
- Pertahankan field, ID, anchor, numbered heading, status, dan parser interface yang dipakai tool. Perubahan struktural harus disertai analisis kompatibilitas dan test.
- Ringkasan mudah dibaca bukan izin menyembunyikan material risk, OPEN blocker, trade-off, atau syarat approval.
- Target halaman/ringkasan atau pengelompokan checkpoint yang mengubah policy harus diajukan eksplisit. Tidak ada truncation kewajiban, bukti, atau requirement agar memenuhi angka.

D. Checkpoint
- Gunakan kalimat pertanyaan konkret, rekomendasi, konsekuensi, lokasi review yang valid, target/revisi/stage, serta langkah resume.
- Default tahap pertama tetap mematuhi complete ready frontier dan approval terpisah. Semua risiko material dan pending dependencies tetap terlihat.
- Opsi wizard/pertanyaan bertahap merupakan proposal terpisah: pertahankan daftar lengkap yang bisa diakses, tampilkan total pending, simpan ID stabil, dan jangan menyamakan item tersembunyi dengan item disetujui.
- Jangan menggabungkan BRD/PRD/FSD/execution approval tanpa perubahan governance yang disetujui. Bukti baru tidak otomatis membatalkan semantic approval, dan approval tidak menciptakan bukti tes.

[NON-GOALS / SAFETY]
Tidak ada command baru, framework rewrite, background controller, queue service, database, engine diagram, dependency baru, atau mandatory ADR universal. Jangan merge BRD/PRD/FSD menjadi satu sumber authority yang ambigu. Jangan memaksa light untuk perubahan payment, privilege, privacy, destructive operation, atau external side effects. Jangan auto-approve, auto-commit, auto-push, auto-publish, auto-deploy, atau mengubah instalasi/global config. Jangan migrasi dokumen historis atau menimpa local changes tanpa otorisasi.

[REQUIRED PLAN OUTPUT]
Berikan:
1. Temuan terverifikasi dengan path/section, dampak, dan pembedaan fakta versus hipotesis usability.
2. Rencana P0/P1/P2: perubahan presentasi/authoring yang kompatibel lebih dahulu; perubahan approval/tier/format mesin terpisah.
3. Daftar file yang berubah beserta alasan; hindari daftar file yang tidak perlu.
4. Before/after satu checkpoint dan contoh BRD/PRD/FSD/ADR yang mewakili hasil akhir, tidak dianggap template drop-in sebelum parser diuji.
5. Regression matrix, metode pengukuran usability/runtime, risiko, rollback, serta keputusan manusia yang benar-benar belum tersedia.
6. Satu next action. Jangan menjalankan implementasi pada mode PLAN_ONLY.

[ACCEPTANCE & EVALUATION]
Uji dengan skenario representatif:
- perubahan label pada layar existing tanpa perubahan perilaku/otorisasi;
- bugfix yang menjaga public contract;
- fitur baru terarah dengan dokumen ringkas tetapi acceptance lengkap;
- existing approved BRD/PRD/FSD yang hanya mengalami evidence refresh;
- permintaan PRD-only yang harus berhenti pada scope dokumen;
- local-only UI tanpa aset provider fiktif;
- networked UI yang tetap membutuhkan proof integrasi nyata sebelum scale-out;
- perubahan billing/access/privacy yang mempertahankan guardrail dan failure cases;
- partial answer, perubahan jawaban, ambiguous approval, dan pertanyaan belum terlihat;
- resume yang tidak mengulang interview, approval, atau tes dengan identitas bukti yang masih valid;
- read-only review yang tidak melakukan remediasi tanpa izin;
- dokumen lama yang tetap dapat dibaca parser.

Ukur secara terpisah: akurasi routing; mandatory coverage; jumlah interruption yang dapat dihindari; waktu reviewer menemukan scope/risiko/keputusan; kemampuan menjelaskan acceptance; output/field tidak relevan; loaded context; token/cost dan durasi per tugas yang benar-benar sukses. Gunakan baseline, model/host/config setara, variasi urutan AB/BA, dan repeated runs bila tersedia. Unknown tetap unknown; synthetic/static pass tidak membuktikan usability atau penghematan runtime.

Pertahankan test existing. Tambahkan behavioral negative controls, bukan sekadar string-presence checks. Gunakan script yang benar-benar ada pada package.json; jalankan tes yang relevan dengan perubahan dan laporkan apa yang tidak dapat dijalankan. Tidak boleh menghapus atau melemahkan safety gate demi membuat benchmark tampak lebih baik.

[DEFINITION OF DONE — AFTER IMPLEMENTATION AUTHORIZATION]
Pengguna dapat menyelesaikan alur representatif tanpa menghafal routing; dokumen utama dapat direview sesuai audiens; authority, compatibility, negative cases, dan verifikasi tetap utuh; existing command/adapter tetap bekerja; tidak ada approval atau sumber kebenaran baru yang tidak diperlukan; perubahan ditopang bukti pengujian. Laporkan hasil aktual, keterbatasan, dan residual risk tanpa klaim persentase yang belum diukur.

---

## Sumber acuan awal
Baca ulang sumber berikut pada commit aktual sebelum bekerja:
- `https://github.com/aultramen/super-compound`
- `https://github.com/aultramen/super-compound/blob/main/.agent/skills/agentic-delivery/references/workflow-integration.md`
- `https://github.com/aultramen/super-compound/blob/main/.agent/context/checkpoint.contract.md`
- `https://github.com/aultramen/super-compound/blob/main/.agent/context/output-style.md`
- `https://github.com/aultramen/super-compound/blob/main/.agent/skills/brainstorming/references/questions-and-options.md`
- `https://github.com/aultramen/super-compound/blob/main/docs/eval-results/context-efficiency-20261005.md`
