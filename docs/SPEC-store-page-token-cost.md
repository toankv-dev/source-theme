# Spec: giảm token của skill `store-page-from-link`

Trạng thái: **đã duyệt ngày 2026-11-12** (bản 3). Người dùng duyệt mà không trả lời các câu hỏi còn mở, nên mọi câu
theo đề xuất:
1. làm M4 trước;
2. giữ model hiện tại;
3. không ghi JSON block qua API;
4. giữ chỉ tiêu ≤ 30% chi phí, ≤ 40 lượt gọi;
5. đặt catalog theo cách a.

Plan: [plan-store-page-token-cost.md](plan-store-page-token-cost.md) · việc: [todo-store-page-token-cost.md](todo-store-page-token-cost.md).

Lịch sử:
- Bản 2: thay catalog dựng tay bằng catalog đọc từ editor.
- Bản 3 (ý tưởng của người dùng): catalog là **một file đặt trong shopdy-promax**. Lần đầu chưa có thì tạo, các lần sau
  dùng lại. Khi phát hiện catalog khác với editor thật thì tự ghi lại đúng phần khác (M3).

Skill: [shopdy-skills/store-page-from-link/](../shopdy-skills/store-page-from-link/SKILL.md) (v1.0.0 → v1.1.0).

## Mục tiêu

Một lần chạy skill (page owearfit.com) tốn **21% hạn mức token** của người dùng. Mục tiêu: chuyển những việc Claude
đang làm bằng tay (đọc code, đọc ảnh, tự viết script tạm) sang **code của skill**, để một page tương tự tốn **≤ 30%
chi phí hiện tại** (≈ 21% → ≤ 6–7% hạn mức), page đạt chất lượng như cũ.

Ràng buộc thêm từ người dùng: shopdy-promax **thay đổi hằng ngày**, nên:
- không ai phải dựng lại catalog bằng tay;
- người dùng không phải pull bản mới mỗi khi shopdy đổi;
- catalog tạo một lần rồi dùng lại, chỉ ghi lại khi thấy lệch với thực tế.

Người dùng: người dựng page, chạy `/store-page-from-link <link>` trong repo shopdy-promax.

## Đo lần chạy thật (bằng chứng)

Transcript `d--shopdy-promax/8449d050….jsonl`, 2026-11-12 07:23 → 07:44, model `claude-opus-5-5`, job
`20261112-owearfit-com`.

- **114 lượt gọi API**. Context mỗi lượt trung bình 210 nghìn token, lớn nhất 325 nghìn. Tổng đọc cache 23,6 triệu,
  ghi cache 0,29 triệu, token viết ra 87 nghìn.
- Chi phí ≈ **số lượt gọi × độ lớn context**. Riêng phần context nền của lượt đầu (70 nghìn token: system prompt,
  tool, `CLAUDE.md` 35 KB của shopdy-promax, SKILL.md) bị đọc lại ở cả 114 lượt, chiếm **25%** chi phí. Mỗi lượt gọi
  bớt được là bớt luôn phần này.
- Thứ gì đọc vào sớm sẽ bị đọc lại ở mọi lượt sau. 18 ảnh chụp đối thủ (~30 nghìn token) đọc ở lượt 7–14 bị đọc lại
  ~100 lần.

Chi phí theo loại việc (đơn vị quy đổi theo giá: đọc cache ×0,1, ghi cache ×1,25, viết ra ×5):

| Việc | Lượt gọi | % chi phí của các lượt đó | % tính cả phần bị đọc lại về sau | Đã xảy ra gì |
| --- | ---: | ---: | ---: | --- |
| D. Đọc code nguồn shopdy-promax | 42 | **33,1%** | 19,1% | grep/sed schema block, renderer, discount, size chart, `scopeBlockCss`, palette, toolbar, media picker, màu xám của `p` trong editor |
| G. Viết analysis, HTML/CSS, build plan | 12 | 15,3% | 9,2% | 8 section HTML+CSS viết tay, 5 plan sinh bằng python inline |
| I. Verify + đọc ảnh kết quả | 10 | 11,5% | 2,5% | 15 ảnh chụp, tự soi màu chữ bị xám, script kiểm tra HTML bị lọc |
| C. Đối thủ dựng bằng chính page builder shopdy: tách block bằng tay | 12 | 9,9% | 8,5% | python inline tách `sp-block--*` + CSS ra `ref/` |
| B. Đọc trang đối thủ | 11 | 6,2% | 13,1% | `outline.md`, `text.md`, 18 ảnh chụp, tự parse FAQ trong DOM, đo màu bằng PIL |
| A. Khởi động + đọc script của skill | 8 | 6,0% | 13,4% | `ls`, kiểm tra playwright, đọc `fetch_competitor.py` và `shopdy.py` (66 nghìn ký tự) để biết đường dẫn, op |
| F. Dò tên trường inspector | 5 | 5,1% | 2,3% | 4 snippet `exec` viết tay (`fields.py`, `mp-state.py`…) |
| E. Đăng nhập, options, hỏi, tạo page | 7 | 4,9% | 3,5% | `options` ra file rồi parse 2 lần |
| H. Upload, build, sửa lỗi | 4 | 4,2% | 1,1% | op "Star size" (thanh trượt không label) lỗi; gắn ảnh review phải viết `exec` |
| J. Báo cáo | 3 | 3,8% | 0,8% | |
| Context nền | — | — | 26,5% | |

Kết luận: phần tốn nhất **không phải dựng page** (build, upload chỉ ~5%). Phần tốn nhất là Claude **đi tìm kiến thức
mà skill chưa đưa sẵn**: schema block, cách render, tên trường, đường dẫn, cách đọc trang đối thủ. Mỗi lần tìm là một
lượt gọi, và kết quả nằm lại trong context đến hết phiên.

## Giả định

1. Đơn vị đo là chi phí quy đổi từ `usage` trong transcript. Hạn mức của gói Claude tính gần đúng theo token, có trọng
   số theo model; tỷ lệ giảm chi phí ≈ tỷ lệ giảm % hạn mức.
2. Không sửa code của shopdy-promax, kể cả `CLAUDE.md` 35 KB của repo đó. File catalog nằm trong thư mục `.claude/`
   của shopdy-promax:
   - git của shopdy bỏ qua thư mục này (`.gitignore` dòng 72), nên file không thuộc code shopdy;
   - ghi file đó không cần mã Jira.
3. Vẫn dựng page qua editor bằng Playwright (yêu cầu gốc). Không ghi JSON block thẳng vào API (xem câu hỏi 3).
4. Giữ nguyên mọi quy tắc cứng: chỉ Draft, guard chặn publish/xoá, không sửa code shopdy khi chưa có mã Jira và chưa
   duyệt, chỉ hỏi Page name + Store.
5. Không thêm thư viện Python mới: chỉ Playwright + thư viện chuẩn. Ảnh tổng hợp được vẽ bằng chính trình duyệt
   Playwright, không cần Pillow.
6. Đã kiểm tra trong code shopdy-promax (chỉ đọc):
   - `GET /api/health` trả về `sha`, là commit mà bản đang chạy được build ra; trên máy dev thì `null`
     (`apps/api/src/features/health/health.routes.ts`).
   - Editor của store page không tự lưu, không có `beforeunload` (chỉ editor của layout có). Vì vậy nếu thêm block mà
     không bấm Save, rồi tải lại trang, thì những block đó mất hết.

## Khi shopdy thay đổi hằng ngày: ai phải làm gì

| Shopdy thay đổi | Ai làm gì |
| --- | --- |
| Thêm block, thêm hoặc đổi trường, đổi label, đổi giới hạn, thêm layout | **Không ai làm gì.** Skill phát hiện chỗ lệch trong lúc chạy bình thường và tự ghi lại đúng phần đó vào file catalog. |
| Đổi cách render, luật lọc HTML/CSS, thêm tính năng mua hàng (hiếm) | Ghi chú tay bị cũ nhưng không chặn việc gì. Claude ghi điều mới gặp vào `catalog-gaps.md`; người bảo trì gộp vào ghi chú khi tiện, rồi phát hành cùng bản skill kế tiếp. |
| Đổi chính khung editor: nút "Add … block", `data-testid` của inspector, canvas (hiếm) | Script báo lỗi rõ chỗ hỏng. Người bảo trì sửa skill, mọi người pull một lần. |

Người dùng chỉ pull source-theme **khi bản thân skill có bản mới**, không theo nhịp của shopdy.

## Thay bằng code: 8 hạng mục

Ước lượng tiết kiệm dựa trên bảng đo ở trên. Các hạng mục cộng dồn với nhau, vì bớt lượt gọi thì bớt luôn phần đọc lại
context nền.

### M1. Trạng thái nạp sẵn khi gọi skill (thay A: 8 lượt → 0)

- `scripts/status.py`: chỉ dùng thư viện chuẩn, luôn exit 0, in ra 10–15 dòng gồm:
  - Playwright đã cài chưa;
  - `.env` có những khoá nào (chỉ in tên khoá, không in giá trị);
  - đã có phiên đăng nhập trong profile chưa;
  - các job trong `_work/`: bước đang dở, `pageId`, ticket đang chờ;
  - **catalog**: có file chưa; nếu có thì gồm bao nhiêu block, lần ghi gần nhất, và có mấy lần tự sửa;
  - nếu có bản source-theme trên máy (`SOURCE_THEME_DIR` hoặc thư mục `../source-theme`) với version skill cao hơn bản
    đã cài, in đúng lệnh cài lại (không gọi mạng);
  - các đường dẫn tuyệt đối cần dùng.
- Gọi qua `` !`python -I "${CLAUDE_SKILL_DIR}/scripts/status.py"` `` trong SKILL.md, nên kết quả có sẵn mà không tốn
  lượt gọi nào. Tài liệu:
  - <https://code.claude.com/docs/en/skills#inject-dynamic-context>
  - `${CLAUDE_SKILL_DIR}`: <https://code.claude.com/docs/en/skills#available-string-substitutions>
- Lệnh được bọc để không bao giờ lỗi, kể cả khi không tìm thấy `python`. Theo tài liệu, một lệnh `!` bị lỗi sẽ huỷ cả
  lần gọi skill.
- `shopdy.py ops` in bảng op và tham số. `shopdy.py help <lệnh>` in hướng dẫn từng lệnh, gồm API của snippet `exec`.
  SKILL.md thêm quy tắc: **không đọc `scripts/*.py`**.
- Tiết kiệm ước tính: ~13%. Phần lớn là 66 nghìn ký tự mã nguồn script không còn nằm trong context.

### M2. Bản tóm tắt trang đối thủ thay cho 18 ảnh (thay B: 11 lượt → 2–3)

`fetch_competitor.py` viết thêm `source/digest.md`, dưới ~6 nghìn token, đủ để viết analysis mà không cần mở DOM:

- **Cả trang:** màu nền, màu chữ, font, độ rộng nội dung, kiểu nút (computed style, mã màu chính xác).
- **Từng section** (`sNN`):
  - vị trí và chiều cao;
  - loại đoán được: hero, cột ảnh + chữ, FAQ, review, CTA, footer…;
  - heading kèm cấp, cỡ chữ, độ đậm, màu;
  - **chữ nguyên văn, kể cả phần ẩn** (câu trả lời FAQ, tab chưa mở);
  - nút: chữ, màu, bo góc, đích tới;
  - media: file, tỷ lệ, nằm bên trái hay phải;
  - khác biệt trên điện thoại: thứ tự, phần bị ẩn.

Ảnh:
- `source/overview-desktop.jpg` và `overview-mobile.jpg`: **mỗi bản một ảnh** gồm cả trang thu nhỏ, có đánh số
  section. Claude đọc 2 ảnh này thay cho 18 ảnh.
- Ảnh cắt của từng section vẫn có, chỉ mở khi cần.

SKILL.md bước 2 đổi thành: đọc `digest.md` và 2 ảnh tổng; chỉ mở ảnh cắt của section còn chưa rõ.

Tiết kiệm ước tính: ~10%.

### M3. File catalog block đặt trong shopdy-promax: tạo một lần, tự sửa khi lệch (thay D: 42 lượt → 0–2)

Catalog chia làm hai phần. Phần hay đổi là file máy tự tạo và tự sửa. Phần ít đổi là ghi chú do người viết.

**Phần 1 — file catalog trong shopdy-promax.**

- **Vị trí:** `D:\shopdy-promax\.claude\skills\store-page-from-link\catalog\`, gồm:
  - `block-catalog.json`: dùng cho plan.py và build;
  - `block-catalog.md`: bản gọn cho Claude đọc;
  - `changes.log`: mỗi lần tự sửa ghi một dòng (ngày, job, block, đổi gì).

  Đây là thư mục mà git của shopdy bỏ qua (giả định 2). Trình cài skill (`tools/install-shopdy-skill.js`) **giữ nguyên
  thư mục `catalog/`** khi cài bản mới, như đang giữ `_work/` và `.env`.
- **Lần đầu (chưa có file):**
  - `create` tạo page Draft của job, rồi tự quét toàn bộ editor và ghi file. Mất 1–3 phút, chạy bằng script nên Claude
    không tốn token.
  - Cách quét:
    - Mở page Draft của chính job ở **chế độ quét**: trong lúc quét, guard **chặn mọi lệnh ghi**, kể cả PATCH của
      chính page này, và ghi lại mọi lệnh đã chặn.
    - Thêm một block của mỗi loại trong palette, rồi mở inspector của từng block, kể cả các nhóm đang đóng.
    - Ghi lại cho mỗi trường: label, loại điều khiển (text, textarea, rich text, code, number, slider, color, select,
      radio/tab, switch, ảnh/media, danh sách cùng các trường của từng mục), lựa chọn, min/max/step, giá trị mặc định.
    - Kèm theo: các nút hành động của block, danh sách layout lấy từ `options`, và `sha` của production lúc quét (lấy
      từ `/api/health`, chỉ để tham khảo).
    - Xong thì tải lại trang mà không Save, nên page trở về như lúc vừa tạo.
- **Các lần sau:** dùng lại file, không quét toàn bộ nữa.
- **Tự phát hiện lệch và ghi lại.** Phần kiểm tra chạy kèm việc skill vẫn làm, không tốn thêm thời gian đáng kể:
  1. **Khi `create`:** so danh sách nút "Add … block" trong palette với file.
     - Loại block mới: quét riêng loại đó ngay lúc ấy, vì page còn trống.
     - Loại block đã mất: đánh dấu `removed`.
  2. **Khi `build` hoặc `inspect` mở inspector của một block có trên page:** so các trường đang thấy (label, loại,
     lựa chọn, min/max) với file. Có khác thì:
     - ghi đè mục của block đó trong file;
     - thêm một dòng vào `changes.log`;
     - in một dòng ngắn trong đầu ra, ví dụ `catalog sửa: reviews +"Badge text", "Star size" 10–32 → 8–40`.
  3. **Khi một op lỗi** vì không tìm thấy label hoặc loại điều khiển đã đổi: đọc lại block đó, ghi lại vào file, rồi
     **tự chạy lại op một lần** theo thông tin mới. Vẫn lỗi thì mới báo exit 5 như cũ.
  4. `catalog --refresh` để ép quét lại toàn bộ khi cần, và `catalog --show <block>` để in một mục.
- **Ghi file an toàn:** viết ra file tạm rồi đổi tên. Khi hai job ghi cùng lúc, mỗi job chỉ ghép mục của block mình
  đã đọc vào bản mới nhất, nên không ghi đè mất phần của job kia.
- **Đánh dấu cái mới:** block hoặc trường nào chưa có ghi chú ở phần 2 sẽ được đánh dấu **MỚI** trong
  `block-catalog.md`. Gặp cái mới, Claude dùng thông tin trong catalog, không đi đọc code.
- **Dùng tự động khi build:** `fill` / `number` / `choose` / `slider` tự chọn cách thao tác theo loại điều khiển trong
  catalog. Lỗi kiểu "Star size" lần trước sẽ không lặp lại.

**Phần 2 — ghi chú viết tay, nằm trong git, ít đổi** (`references/block-notes.md`, thay `block-catalog.md`). Ghi
những điều editor không cho biết:
- block tự tính gì: huy hiệu review đếm số review của sản phẩm; `mainproduct` vẽ product section của theme, gồm gói
  3/6/9, bảng size, sticky ATC;
- luật lọc HTML và luật scope CSS của HTML block (at-rule nào giữ, `@container`);
- các điểm dễ sai của editor, ví dụ màu xám mà canvas phủ lên `p`;
- bảng "tính năng thường gặp trên trang đối thủ → shopdy làm bằng gì".

**Quy tắc mới trong SKILL.md: không đọc code shopdy-promax.** Thứ tự tra cứu:
1. file catalog;
2. `inspect` trên editor thật (sửa luôn catalog nếu lệch);
3. chỉ khi hai nguồn trên không trả lời được mới grep code, rồi ghi câu hỏi và câu trả lời vào
   `_work/<job>/catalog-gaps.md`.

Tiết kiệm ước tính: ~25–30%. Đây là hạng mục lớn nhất.

### M4. Đối thủ cũng dựng bằng shopdy: tự tách block (thay C: 12 lượt → 0)

Khi DOM có `.sp-page` và các `section.sp-block--<type>`, `fetch_competitor.py` viết `source/shopdy-blocks.json`:

- danh sách block theo thứ tự trang, mỗi block có:
  - loại block, phạm vi hiển thị, sticky / bleed;
  - với HTML block: HTML bên trong, kèm CSS đã gỡ scope về dạng thường;
  - giá trị các trường của text / cta / countdown / footer / reviews, đọc từ markup;
- `max-width` của page.

Lần chạy owearfit có đúng 18 block như vậy. M6 dựng plan nháp thẳng từ file này; ảnh đổi sang `{{media:…}}`.

Tiết kiệm ước tính: ~9%, cộng phần lớn của G khi đối thủ là shopdy.

### M5. Bổ sung op và lệnh mà lần chạy phải tự viết `exec` (thay F, một phần H)

- Tên trường của mọi loại block có sẵn trong catalog (M3). Không còn `fields.py` / `fields2.py`.
- `inspect --values <block>`: đọc giá trị đã lưu của một block. Thay cho `b5.py`.
- Op `slider`: chỉnh thanh trượt không có label chuẩn ("Star size").
- Op `item-image`: gắn ảnh từ Media library cho một mục trong danh sách, ví dụ ảnh của review. Thay cho
  `review-photos.py`.
- `options` in gọn mặc định: store dạng bảng, layout kèm danh sách block. Bản JSON đầy đủ ghi ra file.
- `build` và `verify` in gọn mặc định (vài dòng). Chi tiết đầy đủ ghi ra file JSON.

Tiết kiệm ước tính: ~5%.

### M6. Plan nháp và chọn layout bằng code (giảm G)

- `scripts/plan.py layout --job <job>`:
  - chấm điểm từng layout bằng cách so thứ tự block của layout với thứ tự section đối thủ (sequence alignment);
  - in layout tốt nhất, lý do, và các block cần xoá / thêm / di chuyển.
- `scripts/plan.py draft --job <job> --layout <tên>`: sinh `build-plan.draft.json` theo catalog, gồm:
  - op sắp xếp lại layout;
  - op điền chữ nguyên văn, màu, `{{media:…}}` cho mọi section ✅;
  - với đối thủ shopdy: cả HTML/CSS lấy từ M4.

  Claude chỉ sửa chỗ cần sửa, không viết plan từ đầu.

Tiết kiệm ước tính: ~6–8%. Token viết ra giá gấp 5 lần, và nội dung đã viết cũng nằm lại trong context.

### M7. Verify tự so với đối thủ (giảm I)

- `verify` ghi thêm `compare.json`. Với từng section:
  - so style của heading, đoạn văn, nút (màu, cỡ chữ, độ đậm, font) giữa page dựng được và `digest.md`. Ví dụ lỗi lần
    trước sẽ hiện thành `s05 p color #62676F ≠ #111111`;
  - tính điểm giống nhau về hình (diff điểm ảnh của hai ảnh cắt cùng độ rộng). Chỉ section dưới ngưỡng mới có ảnh ghép
    đặt cạnh nhau.
- `verify` tự báo thẻ HTML bị bộ lọc của shopdy gỡ mất. Thay cho `final-check.py`.
- SKILL.md bước 7: đọc phần tóm tắt `compare`, **chỉ mở ảnh của section bị đánh dấu** (tối đa 4 ảnh mỗi vòng).

Tiết kiệm ước tính: ~6%.

### M8. SKILL.md gọn hơn và tool đo token

- SKILL.md:
  - mỗi bước gọi đúng một lệnh;
  - quy tắc tiết kiệm: gộp lệnh, không đọc cả file lớn, không đọc script, không đọc code shopdy;
  - đường dẫn dùng `${CLAUDE_SKILL_DIR}`;
  - dưới 160 dòng.
- `tools/transcript-cost.js` trong repo này, có test:
  - đọc transcript Claude Code, in số lượt gọi, các loại token, chi phí quy đổi, bảng theo tool và theo bước của skill,
    số ảnh đã đọc;
  - dùng để đo chỉ tiêu bên dưới và đo mỗi phiên bản skill sau này.
- Không làm (đã cân nhắc):
  - `context: fork`: skill phải hỏi Page name / Store giữa chừng và chạy nhiều lượt, mà subagent fork chạy nền không
    thấy hội thoại (<https://code.claude.com/docs/en/skills#run-skills-in-a-subagent>);
  - rút gọn `CLAUDE.md` của shopdy: nằm ngoài phạm vi (giả định 2);
  - catalog dựng tay và commit vào git (spec bản 1): phải dựng lại và pull theo nhịp đổi của shopdy, và dễ lệch với
    production;
  - quét lại toàn bộ mỗi khi production deploy (spec bản 2): tốn 1–3 phút mỗi lần deploy, trong khi phần lớn các lần
    deploy không đổi gì trong page builder. Thay bằng kiểm tra lệch ngay trong lúc chạy.

### Dự kiến sau khi làm

| | Lần chạy owearfit (đo) | Dự kiến |
| --- | ---: | ---: |
| Lượt gọi API | 114 | 25–40 |
| Context trung bình | 210 nghìn | ~100–130 nghìn |
| Ảnh đọc vào context | 33 | ≤ 8 |
| Lượt đọc code shopdy / script skill | 42 / 3 | 0–2 / 0 |
| Chi phí quy đổi | 3,16 triệu | ≤ 0,95 triệu (≤ 30%) |
| Thời gian thêm | — | +1–3 phút ở lần chạy đầu trên mỗi máy (0 token); các lần sau ~0 |

## Lệnh

```
# Test của skill (Python thư viện chuẩn, không cần pytest)
python -m unittest discover -s shopdy-skills/store-page-from-link/tests -v

# Test các tool của repo này (có transcript-cost và trình cài)
cd tools && npm test

# Cài sang shopdy-promax (chỉ khi skill có bản mới; giữ _work/, catalog/, .env)
node tools/install-shopdy-skill.js D:\shopdy-promax

# Trong shopdy-promax, do skill tự gọi (người dùng không phải gõ)
python -I .claude/skills/store-page-from-link/scripts/status.py
python -I .claude/skills/store-page-from-link/scripts/shopdy.py catalog [--refresh | --show <block>]

# Đo một lần chạy
node tools/transcript-cost.js --project D:\shopdy-promax --latest
node tools/transcript-cost.js C:\Users\ADMIN\.claude\projects\d--shopdy-promax\<session>.jsonl
```

## Cấu trúc

```
shopdy-skills/store-page-from-link/
  SKILL.md                    gọn lại, chèn kết quả status.py, quy tắc tiết kiệm, version 1.1.0
  .gitignore                  + catalog/
  references/block-notes.md   MỚI, viết tay: hành vi render, luật HTML/CSS, điểm dễ sai, tính năng → block
                              (thay block-catalog.md)
  references/editor-ui.md     bảng op mới (slider, item-image), lệnh mới
  scripts/status.py           MỚI, chỉ thư viện chuẩn, luôn exit 0
  scripts/catalog.py          MỚI: quét editor (chế độ chỉ đọc), so lệch, ghép mục, ghi file an toàn, ghép ghi chú
  scripts/fetch_competitor.py + digest.md, overview-*.jpg, shopdy-blocks.json
  scripts/plan.py             MỚI: layout, draft
  scripts/_common.py          guard thêm chế độ quét (chặn mọi lệnh ghi)
  scripts/shopdy.py           + catalog, ops/help, inspect --values, slider, item-image, so lệch khi mở inspector,
                              chạy lại op sau khi sửa catalog, đầu ra gọn, verify compare + kiểm tra HTML bị lọc
  tests/                      MỚI: unittest + fixtures HTML tự tạo, nhỏ (không chép trang của đối thủ)
tools/install-shopdy-skill.js giữ thêm thư mục catalog/
tools/test/install-shopdy-skill.test.js
tools/transcript-cost.js      MỚI
tools/test/transcript-cost.test.js
docs/SPEC-store-page-token-cost.md, plan-…, todo-…

Trên máy người dùng (không nằm trong git nào):
D:\shopdy-promax\.claude\skills\store-page-from-link\catalog\block-catalog.json | block-catalog.md | changes.log
```

## Phong cách code

Giống các script hiện có: Python thư viện chuẩn + Playwright sync, `pathlib`, đầu ra JSON có `ok` và đường dẫn file,
và mã thoát như cũ (3 = không phải Draft, 4 = chưa đăng nhập, 5 = op lỗi, 6 = guard chặn). Mỗi lệnh in **tóm tắt
ngắn** ra stdout và ghi bản đầy đủ ra file. Ví dụ đầu ra mong muốn:

```
catalog created  21 blocks · 187 fields · 5 layouts in 94 s · writes blocked 0 · prod 4122adb
  MỚI (chưa có ghi chú): block "quiz" · reviews."Star size" kind=slider
  file .claude/skills/store-page-from-link/catalog/block-catalog.md
```

```
build  op 14/40 select reviews · catalog sửa: reviews +"Badge text", "Star size" 10–32 → 8–40 · op chạy lại: ok
```

```
layout Advertorial  score 0.71  reuse 7/16  (countdown, cta×3, text, reviews, footer)
  delete: header, heading×4, image, text×2   move: cta#3 → before reviews   add: html×9, mainproduct
next   Blank page 0.42 · Listicle 0.38 · News article 0.31
full   _work/20261112-owearfit-com/layout-score.json
```

Một mục trong `block-catalog.json`:

```json
{"type": "reviews", "palette": "Add Reviews block", "checked": "2026-11-12", "fields": [
  {"group": "Content", "label": "Style", "kind": "select", "options": ["Simple", "Product"]},
  {"group": "Content", "label": "Star size", "kind": "slider", "min": 10, "max": 32, "step": 1, "value": 13}],
 "actions": ["Move up", "Move down", "Duplicate", "Delete"], "notes": true}
```

## Kiểm thử

- **Unit (unittest, fixture tự tạo):**
  - phân loại điều khiển trên một inspector HTML giả (đủ mọi loại, có danh sách lồng nhau);
  - **so lệch:** thêm / bớt / đổi label / đổi loại / đổi min-max cho ra đúng danh sách thay đổi; không đổi gì thì
    không ghi file;
  - **ghi file an toàn:** hai lần ghi chen nhau (mỗi lần một block) giữ được cả hai mục;
  - đánh dấu MỚI khi block / trường chưa có trong `block-notes.md`;
  - **guard ở chế độ quét chặn mọi lệnh ghi** (POST/PATCH/PUT/DELETE, kể cả PATCH page của job);
  - parser `sp-block` (M4) trên một trang shopdy giả có html / cta / text / countdown / reviews / footer;
  - digest (M2) trên một trang nhỏ có FAQ ẩn, cột ảnh + chữ, nút;
  - chấm điểm layout và sinh plan nháp (M6);
  - so sánh style (M7);
  - `status.py`:
    - khi thiếu `.env`, thiếu playwright, chưa có catalog, có job dở;
    - luôn exit 0, không in giá trị bí mật.
- **Node test:**
  - `transcript-cost.js` trên một transcript giả: gộp các dòng có cùng `message.id`, tính đúng token và số ảnh;
  - trình cài giữ nguyên `catalog/` khi cài bản mới.
- **Chạy thật trên stack local:**
  - Dựng lại owearfit bằng tài khoản admin tạm, xoá tài khoản sau khi xong như lần trước.
  - Lần quét đầu: `guard.log` không có lệnh ghi nào bị chặn ngoài dự kiến; sau khi quét, page trong DB không đổi.
  - Đo bằng `transcript-cost.js`. Page phải đạt `verify` sạch và đủ block như lần trước.

## Ranh giới

- **Luôn:**
  - giữ guard và các quy tắc cứng;
  - test xanh trước khi giao;
  - tăng version của skill;
  - cài lại sang shopdy-promax rồi chạy thử thật;
  - không in và không lưu thông tin đăng nhập.
- **Hỏi trước:**
  - cho skill ghi block qua API của editor thay cho thao tác UI (câu hỏi 3);
  - đổi model của skill (câu hỏi 2);
  - thêm thư viện Python / npm;
  - chạy bất cứ gì nằm ngoài stack local của shopdy-promax khi thử;
  - đặt catalog ở chỗ khác `.claude/` (câu hỏi 5).
- **Không bao giờ:**
  - sửa code hay file nào **được git theo dõi** của shopdy-promax;
  - quét catalog trên page nào khác page của job;
  - Save trong lúc quét;
  - commit nội dung hay ảnh của trang đối thủ vào repo (fixture phải tự tạo);
  - nới allow-list của guard.

## Tiêu chí hoàn thành

1. Dựng lại owearfit (cùng link, cùng store test trên stack local) với skill v1.1.0 trong một phiên mới, đo bằng
   `transcript-cost.js`:
   - **≤ 40 lượt gọi**;
   - **chi phí quy đổi ≤ 30%** của 3,16 triệu;
   - **0** lần đọc `scripts/*.py`;
   - **≤ 2** lần đọc code shopdy-promax, kèm ghi chú trong `catalog-gaps.md`;
   - **≤ 8** ảnh đọc vào context.
2. Page kết quả:
   - vẫn Draft;
   - có cùng chuỗi block như lần trước;
   - `verify` không còn lỗi nào chưa giải thích;
   - `compare` không còn section nào dưới ngưỡng mà không có lý do trong báo cáo.
3. File catalog:
   - **lần đầu chưa có file:** job tạo file; `git status` của shopdy-promax vẫn sạch;
   - **job thứ hai:** không quét toàn bộ;
   - **giả lập lệch** (sửa tay một mục trong file: bỏ một trường, đổi label, đổi min-max): job kế tiếp dùng block đó
     thì tự ghi lại đúng mục ấy, op chạy được, có dòng trong `changes.log`;
   - **giả lập block mới** (xoá một loại block khỏi file): `create` kế tiếp quét riêng loại đó và ghi lại;
   - quét xong, page của job trong DB y như trước khi quét;
   - cài lại skill không làm mất file catalog.
4. Một link đối thủ **không** dựng bằng shopdy (bạn chọn): ≤ 50 lượt gọi, đo và ghi vào báo cáo.
5. `python -m unittest …` và `cd tools && npm test` (phần test của các file mới) đều xanh. Cài lại sang shopdy-promax
   không đụng `_work/`, `catalog/` và `.env`.

## Câu hỏi còn mở

Nếu bạn duyệt spec mà không trả lời, tôi làm theo đề xuất của từng câu.

1. Link đối thủ bạn hay dùng phần lớn là **trang dựng bằng shopdy** như owearfit, hay Shopify / nền tảng khác?
   Đề xuất: làm M4 trước (đã có trang mẫu thật), M2 + M6 cho trang ngoài làm ngay sau.
2. **Model:** skill có được tự chạy bằng Sonnet 5.5 (`model:` trong frontmatter) thay cho Opus không?
   Đề xuất: giữ model hiện tại, làm M1–M8, đo lại, rồi mới quyết.
3. Với đối thủ dựng bằng shopdy, có cho skill **ghi thẳng JSON block** qua API mà editor vẫn dùng khi bấm Save
   (cùng endpoint, vẫn Draft, vẫn qua guard) không?
   Đề xuất: **chưa**, giữ thao tác UI như yêu cầu gốc.
4. Chỉ tiêu **≤ 30% chi phí, ≤ 40 lượt gọi** đã phù hợp chưa?
5. **Chỗ đặt file catalog.** Có ba cách:

   | Cách | Ai dùng chung | Điều kiện |
   | --- | --- | --- |
   | a. `.claude/` của shopdy-promax, mỗi máy một file | Mỗi máy tự tạo một lần | Không cần ticket; làm được ngay |
   | b. Commit vào code shopdy-promax, chung cho mọi người qua git | Mọi người | Mỗi lần skill ghi lại là một lần sửa code shopdy, nên cần mã Jira + duyệt. Không tự ghi được. |
   | c. Lưu trên server shopdy (API / DB mới), chung cho mọi người | Mọi người, cập nhật tức thì | Phải làm tính năng mới trong shopdy: ticket, spec, deploy |

   Đề xuất: **a** (spec này). Nếu sau này muốn mọi người dùng chung, làm ticket cho cách tốt hơn cả c: shopdy tự trả
   catalog sinh từ chính code của nó. Khi đó không ai phải quét nữa.
