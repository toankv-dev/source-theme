# Spec: `theme-edit` — skill sửa theme

Trạng thái: **xong ngày 2026-11-20**. Bản đồ: [SPEC-theme-token-cost.md](SPEC-theme-token-cost.md).
Skill: [.claude/skills/theme-edit/SKILL.md](../.claude/skills/theme-edit/SKILL.md).

## Mục tiêu
Sửa theme là việc làm nhiều nhất và tốn nhất (phiên A 42,4M cho 38 yêu cầu). Skill ghép các tool của đợt 1–2 thành một
quy trình ngắn cho 4 kịch bản của người dùng:

| Luồng | Kịch bản (yêu cầu gốc) | Cách làm | Ngân sách |
|---|---|---|---|
| A | 2.1 sửa code: responsive, thêm chức năng | design map → `--part` → mở đúng dòng → sửa (qua `_src/` nếu có) → `edit-check` | ≤ 10 lượt việc nhỏ, ≤ 30 tính năng |
| B | 2.2 làm giống phần / template của link khác | `section-grab` (đọc `section.md`) hoặc `media-grab` / `download-page` → dựng như A → `edit-check --ref` | ≤ 30 lượt |
| C | 2.3 người dùng tự làm được | trả lời từ `platform-guide.md` + design map, hướng dẫn từng bước | ≤ 3 lượt, 0 lần đọc code shopdy |
| D | 2.4 cần sửa cả shopdy | dừng → bảng "shopdy làm / theme làm / admin làm" → duyệt → làm phần theme → spec `D:\shopdy-promax\docs\<ngày>-spec-<chủ đề>.md` + nháp Jira; không sửa code shopdy | ≤ 10 lượt trước khi duyệt |

Đầu yêu cầu: `theme-map.js` + đọc map + `_map/edit-log.md`. Cuối yêu cầu: refresh map + ghi chú, một dòng edit-log,
`edit-check --zip`, báo cáo tiếng Việt, nhắc `/clear`. Bot check: báo đúng điều tool in, đề nghị `--headed` hoặc ảnh
chụp, không bao giờ lách.

## File
`.claude/skills/theme-edit/SKILL.md`, `references/platform-guide.md` (+ `.sources.json`), `references/shopdy-split.md`
(bảng, mẫu spec shopdy, mẫu ticket Jira). CLAUDE.md: luật "sửa theme có sẵn → theme-edit".

## Tiêu chí (đo bằng `transcript-cost.js --by-request` ở các phiên sửa tiếp theo)
- Mỗi yêu cầu một phiên; context TB ≤ 150k.
- Loại A nhỏ ≤ 10 lượt; loại C ≤ 3 lượt và 0 lần đọc code shopdy; loại D có bảng trước mọi dòng code.
- Đọc code theme trước lần sửa đầu tiên ≤ 2 lần cho một sửa nhỏ (phiên 06a2156e: 119 lần đọc trong 4 yêu cầu).
