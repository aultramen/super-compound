# Examples

## Empty context

“Gunakan `/sc-hints <pertanyaan atau kondisi>`, misalnya
`/sc-hints Saya punya PRD approved, langkah berikutnya apa?` atau
`/sc-hints Mengapa test modul order ini sulit ditulis?`.
Bantuan apa yang Anda perlukan?” No project facts or files are invented.

## Approved PRD, no FSD

After inspecting the actual PRD and bounded FSD locations:
“Kondisi: PRD revisi yang ditunjuk sudah approved; FSD belum ditemukan di lokasi
yang diperiksa. Rekomendasi: `/sc-plan <path PRD>` untuk membuat authority teknis
dan GOAL. Prasyarat: PRD approved dan keputusan produk tidak terbuka.
Hasil: FSD dengan kontrak dan verification map, lalu goal pointers setelah gate.
Alasan: PRD mendefinisikan hasil produk; implementasi full-tier memerlukan FSD.
Konsekuensi: desain teknis dilakukan sebelum coding.” Include the actual openable
PRD approval section and inspected FSD locations; placeholders are not evidence.

## Test seam question

`/sc-hints Mengapa test modul order ini sulit ditulis?`: inspect the named module,
callers and nearby tests. Explain an observed coupling only if source supports
it; otherwise label the seam hypothesis and suggest the narrow inspection.
Recommend `/sc-debug <failure>` for a failing test, or `/sc-plan <material seam
change>` when technical authority must change. Do not start a refactor merely
because the user accepts the explanation.

## Prototype decision

`/sc-hints Kapan saya perlu prototype sebelum membuat FSD?`: use `/sc-explore`
when a named design question needs runnable evidence (state, behavior, interaction).
State what uncertainty the prototype answers and how its evidence returns to
BRD/PRD authority. Existing facts may make a prototype unnecessary. Prototype
evidence is not production authority or real provider integration proof.

## After compact

`/sc-hints Bagaimana melanjutkan pekerjaan setelah compact?`: read relevant saved
intent/pointers when available, use context-engineering's recovery branch, and
recommend `/sc-status` to reconcile current sources and dependencies. Missing
state stays unknown; hints does not manufacture STATE or a second handoff.

## Multiple human needs

For five independent ready needs and one dependent need, use the entire central
checkpoint package, not a three-item interview. Keep Q1-Q5 ready, Q6 pending on
its actual prerequisite, include verified absolute review paths and both
“Saya setuju semua rekomendasi pada daftar di atas.” and
“Saya setuju semua rekomendasi kecuali Q2: [jawaban khusus].”
Accepting the advice resolves neither environment test results nor access proof.
