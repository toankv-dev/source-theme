# Missing tools: ticket → Jira key → spec + plan → approval → code

Steps 5–6 of the skill. The process itself is `shopdy-dev-workflow.md` (the team's document); the code rules are
the repo's `CLAUDE.md`. This file says what the skill writes and when.

## The gate (rule 6) — check it before ANY change under the repo

Do not create a branch, edit, add or delete anything outside `.claude/skills/store-page-from-link/_work/` unless
**both** hold for that ticket in `state.json`:

1. `jiraKey` — given by the user (`SHOPDY-<number>`); never invented, never taken from a draft;
2. `approvedAt` — the user said, in their own words, that the spec and plan for that key are approved.

"Go ahead", "ok" about something else, a key without approval, or approval without a key are not enough. Small,
obvious, one-line fixes are not an exception. If either is missing: stop and ask.

## 5.1 Ticket draft — `_work/<job>/tickets/T<n>-<slug>.md` (Vietnamese)

One ticket per missing capability (group the sections that need the same tool). Write it for the lead, who has not
seen the competitor page:

```markdown
# [Store pages] <tên công cụ còn thiếu, ngắn gọn>

**Loại:** Feature · **Module:** Store pages (page builder) · **Ưu tiên đề xuất:** <cao/trung bình/thấp + lý do>

## Bối cảnh
Đang dựng page "<page name>" (store <store>, Draft) theo trang đối thủ <url>. Phần <section id + mô tả> chưa làm
được bằng block hiện có vì <lý do cụ thể: block nào thiếu gì / HTML block bỏ <iframe>/<script>/<form> …>.
Ảnh minh hoạ: <đường dẫn ảnh section của đối thủ trong _work, đính kèm khi tạo ticket>.

## Yêu cầu
- <hành vi người mua thấy được, trên PC và điện thoại>
- <người bán chỉnh được gì trong editor (inspector)>
- <giới hạn: số item tối đa, kích thước, chạy được ở 360 px>

## Tiêu chí nghiệm thu
- [ ] Có trong palette của editor / layout picker, kéo thả và click-to-add đều được
- [ ] Hiển thị đúng ở 360 px và 1440 px, không cuộn ngang, chữ ≥ 12 px, nút ≥ 44 px
- [ ] Lưu / mở lại page giữ nguyên dữ liệu; page cũ không bị đổi (field mới là optional)
- [ ] Click (nếu là nút) được đếm như CTA

## Implementation (dev điền trước khi code — mục 4 của quy trình)
### Solution
<cách tiếp cận đề xuất, 2–5 câu>
### Code
- `packages/shared-types/src/domain/page-block.ts` — <…>
- `apps/web/src/features/store-pages/components/…` — <…>
- `apps/api/src/features/store-pages/…` / `features/storefront/…` — <…>
### Config
Không có
### Migration
Không có (block lưu trong JSON `store_pages.blocks`) | <…>
### Impact
- Màn hình/API bị ảnh hưởng: editor store page, render storefront của page
- Caller của code dùng chung đã cập nhật: <…>
- QC cần test: <…>
```

Fill Solution/Code/Impact from the real code (query the graphify graph first, per `CLAUDE.md` §1), as a proposal the
lead can change. A new block type usually touches: the zod schema + `PAGE_BLOCK_TYPES`/labels in
`page-block.ts`, `compile-blocks-to-html.ts` (server render), `block-preview.tsx` (editor preview),
`block-palette.tsx` (`BLOCK_META`), `block-inspector.tsx` (fields), `createPageBlock`, and their co-located tests.
A new built-in layout: `page-template.ts` (+ its own template file) and `page-layout.ts` seeds.

No layout fits (rule 11) → the ticket asks for a built-in layout with the competitor's section order, listing each
section and the block it maps to.

## 5.2 Ask for the Jira key

Show the user each draft (title + one line why + file path) and ask them to create it in Jira and send the key. Do
not create Jira tickets yourself (the Atlassian connector is not part of this flow) and do not wait idle: keep
building with the existing tools (rule 8). Record in `state.json`:

```json
"tickets": [{"id": "T1", "title": "Video embed block", "sections": ["s05", "s11"],
             "draft": "tickets/T1-video-embed.md", "status": "awaiting-key"}]
```

Statuses, in order: `drafted` → `awaiting-key` → `keyed` (jiraKey set) → `spec-ready` → `approved` (approvedAt set)
→ `in-progress` (branch) → `pr-open` (pr url) → `merged` → `on-production` (the user says so) → `done` (the page
section is built with the new tool).

## 5.3 Spec and plan (after the key, before any code)

Per `CLAUDE.md` §13 (Superpowers convention of this repo), on approval they go to:

- spec: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- plan: `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`

Until approval, write them as drafts in `_work/<job>/specs/` (not in the repo tree). Spec: goal, the competitor
section it serves (screenshot path), user-visible behaviour on PC and phone, data shape (zod, optional fields only —
saved pages must parse byte-for-byte), renderer + editor + inspector changes, what stays unchanged, test plan,
risks. Plan: ordered tasks, each with the files it touches, the test it adds, and the GATE. Show both to the user
and ask for approval of `SHOPDY-<n>`. If the `superpowers` skills are installed, use `superpowers:brainstorming` /
`superpowers:writing-plans` to produce them; never run OpenSpec for the same change as well.

## 5.4 Code (only after the gate above passes)

1. `git status` — if the working tree is not clean, or the current branch has someone's unfinished work, stop and
   ask; never stash, reset or discard it.
2. `git checkout main && git pull && git checkout -b SHOPDY-items/SHOPDY-<n>`.
3. Move the approved spec + plan into `docs/superpowers/…`; commit them first.
4. Implement in the ticket's scope only; tests next to the code (`.test.ts(x)`); additive changes to shared code
   (`CLAUDE.md` §4); query the graph before reading files (`CLAUDE.md` §1).
5. GATE: `pnpm typecheck`, `pnpm test`, `pnpm lint` — all green before each commit. Then the real flow on local
   (`pnpm dev:all`): the new block in the editor (add, edit, save, reload) and its render. Report failures honestly.
6. Commits: `feat(store-pages): SHOPDY-<n> <tóm tắt>`. **No `Co-Authored-By` trailer** (this repo's `CLAUDE.md`
   §10). Never `--no-verify`.
7. Ask the user before pushing and before opening the PR. PR title `[SHOPDY-<n>] <tóm tắt>`; body: ticket link,
   summary, how it was self-tested, screenshots, the Definition of Done checklist.
8. Never merge without the user telling you the lead accepted; never deploy (the lead does).
9. Set the ticket's status in `state.json`, tell the user to move the Jira ticket, then pause the job (step 8 of the
   skill): production takes a while; the user comes back when it is live.
