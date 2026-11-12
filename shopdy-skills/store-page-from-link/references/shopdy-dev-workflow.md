# Quy trình làm việc & Deploy — Adlux Promax

> Bản lưu của tài liệu "Quy trình làm việc & Deploy — Adlux Promax" (Nov 3, 2026 · @Tien, bản PDF gửi qua
> Telegram). Skill `store-page-from-link` làm theo đúng tài liệu này mỗi khi phải sửa code shopdy. Quy tắc kỹ
> thuật đầy đủ nằm trong `CLAUDE.md` ở gốc repo — đọc file đó trước khi sửa code.

## 1. Tổng quan

Mọi thay đổi code đi theo một đường duy nhất: **ticket Jira → PR vào `main` → staging → QC verify → lead deploy
production → QC sanity**. Không có lối tắt — không push thẳng `main`, không deploy khi ticket chưa ở
**Resolved-Verified**.

| Vai trò | Trách nhiệm chính |
| --- | --- |
| Lead | Tạo và giao ticket trong sprint, review/accept/reject PR, deploy production |
| Dev | Viết implementation vào ticket, code, self-test local, tạo PR, merge sau khi được accept, chuyển ticket sang Resolved |
| QC | Viết testcase, verify trên staging, chuyển ticket sang Resolved-Verified, sanity trên production sau deploy |

Vòng đời ticket (3 vai trò, 2 vòng lặp): Lead giao ticket vào sprint (To Do) → Dev viết implementation
(→ In-progress) → code + self-test local → tạo PR vào `main` → Lead review PR (reject → sửa lại trên cùng PR) →
accept → Dev merge PR (→ Resolved) → QC verify trên staging (fail → Reopened, trả lại dev; pass →
Resolved-Verified) → Lead deploy production (chỉ ticket Resolved-Verified) → QC sanity production.

## 2. Jira & Sprint

Dự án quản lý trên Jira, sprint **2 tuần**. Lead đưa ticket vào sprint và giao cho dev với status **To Do**. Mỗi
status chỉ do một vai trò chuyển, để nhìn board là biết ticket đang nằm ở tay ai.

| Status | Ý nghĩa | Ai chuyển sang | Điều kiện để chuyển |
| --- | --- | --- | --- |
| To Do | Ticket đã giao, chưa bắt đầu | Lead | Ticket có mô tả yêu cầu và được assign cho dev |
| In-progress | Dev đang làm | Dev | Dev nhận ticket (từ To Do hoặc Reopened); implementation được viết vào ticket trước khi code |
| Resolved | Code đã merge vào `main` | Dev | PR đã được lead accept và merge thành công |
| Reopened | QC test trên staging không pass, trả lại dev | QC | Có ít nhất một testcase fail; QC comment bước tái hiện, kết quả mong đợi và kết quả thực tế |
| Resolved-Verified | QC đã verify pass | QC | Tất cả testcase pass trên staging |

Ticket **Reopened** quay lại tay dev: dev chuyển sang **In-progress**, cập nhật implementation nếu hướng sửa thay
đổi, tạo lại branch từ `main` mới nhất (cùng format tên, mục 5), mở PR mới và đi lại quy trình từ bước review. Sau
khi lead deploy production và QC sanity pass, ticket được đóng theo quy ước của board (hỏi lead nếu board có thêm
status Done/Closed).

## 3. Quy trình từng bước cho dev

Dev làm đủ 9 bước dưới đây cho mỗi ticket; bước 2 (viết implementation) phải xong **trước** khi viết dòng code đầu
tiên.

1. **Nhận ticket** ở status To Do (hoặc Reopened), chuyển sang **In-progress**.
2. **Viết implementation vào ticket** theo template ở mục 4 (Solution, Code, Config, Migration, Impact). Ticket lớn
   hoặc chạm vùng nhạy cảm (storefront/checkout, auth, schema) thì ping lead xem trước khi code.
3. **Tạo branch từ `main` mới nhất**: `git checkout main && git pull && git checkout -b SHOPDY-items/SHOPDY-<số ticket>`.
4. **Code** — chỉ trong phạm vi ticket. Thấy lỗi khác thì tạo ticket mới, không sửa kèm.
5. **Self-test ở local**: chạy GATE (`pnpm typecheck`, `pnpm test`, `pnpm lint`) và test tay luồng thật trên
   `pnpm dev:all`. Ghi lại đã test những gì.
6. **Tạo PR vào `main`**, tiêu đề có Jira key, mô tả dán link ticket + checklist Definition of Done (mục 5). Dán link
   PR vào ticket.
7. **Chờ lead review.** Bị reject → sửa theo comment, push thêm commit lên cùng branch, báo lead review lại.
8. **Lead accept → dev tự merge PR.** Kiểm tra commit đã lên `main` và CI (nếu có) xanh.
9. **Chuyển ticket sang Resolved**, comment commit/PR đã merge để QC biết cần verify gì.

## 4. Template implementation trong ticket

Mỗi ticket phải có đủ 5 mục dưới đây trước khi code; mục nào không áp dụng thì ghi "Không có", không bỏ trống. Lead
dùng phần này để review hướng giải quyết, QC dùng mục Impact để viết testcase.

| Mục | Viết gì |
| --- | --- |
| Solution | Nguyên nhân (với bug) hoặc cách tiếp cận (với feature), 2–5 câu |
| Code | Danh sách file/hàm sửa chính và sửa gì — không dán toàn bộ code |
| Config | Biến môi trường mới/đổi (tên + giá trị mặc định, KHÔNG ghi secret), feature flag, cấu hình hạ tầng |
| Migration | Migration Prisma (tên, bảng/cột thêm), ClickHouse migration, seed cần chạy, script backfill |
| Impact | Module/màn hình bị ảnh hưởng, caller của code dùng chung, rủi ro và những gì QC cần test |

Mẫu để copy vào ticket:

```markdown
### Solution
<Nguyên nhân / cách tiếp cận>

### Code
- `apps/api/src/features/<feature>/...` — <sửa gì>
- `apps/web/src/features/<feature>/...` — <sửa gì>

### Config
- Không có | `TEN_BIEN=<giá trị mặc định>` (thêm vào .env.example)

### Migration
- Không có | `<timestamp>_<ten_migration>`: thêm cột ... vào bảng ...

### Impact
- Màn hình/API bị ảnh hưởng: ...
- Caller của code dùng chung đã cập nhật: ...
- QC cần test: ...
```

Ví dụ (minh họa, không phải ticket thật):

```markdown
### Solution
Trang Orders lọc theo ngày bằng giờ UTC nên đơn lúc 23h bị đẩy sang ngày hôm sau.
Chuyển sang lọc theo system timezone, giống cách dashboard đang làm.

### Code
- `features/orders/application/list-orders.use-case.ts` — tính khoảng ngày theo system timezone
- `features/orders/application/list-orders.use-case.test.ts` — thêm test cho ngày biên

### Config
Không có

### Migration
Không có

### Impact
- Trang Orders (filter ngày) và export CSV dùng chung use-case này
- QC cần test: đơn tạo lúc 23:30 hiển thị đúng ngày; export khớp với danh sách
```

## 5. Branch, commit, PR và GATE

Một ticket = một branch = một PR vào `main`, và PR chỉ được mở khi GATE xanh. Quy tắc đầy đủ nằm trong `CLAUDE.md`
ở gốc repo — dev đọc file này trước khi làm ticket đầu tiên.

**Branch**

- Bắt đầu code thì tạo branch từ `main` mới nhất, tên bắt buộc theo format `SHOPDY-items/SHOPDY-<số ticket>`. Ví dụ
  ticket SHOPDY-123 → branch `SHOPDY-items/SHOPDY-123`. Không dùng format khác (`feat/...`, `fix/...`).
- Branch ngắn ngày; rebase/pull `main` hằng ngày để tránh conflict lớn.
- Không push thẳng `main`, không force-push / `reset --hard` trên `main`.

**Commit**

- Định dạng: `feat|fix|refactor|chore(scope): <JIRA-KEY> tóm tắt`, ví dụ
  `fix(orders): SHOPDY-123 filter ngày theo system timezone`.
- Không dùng `--no-verify`. Hook pre-commit chạy lint-staged + test nhưng **không** chạy typecheck.
- Code và test đi cùng một commit; mỗi hàm/component public có file `.test.ts(x)` đặt cạnh.

**GATE — chạy trước mỗi commit và trước khi mở PR**

```bash
pnpm typecheck   # api + web, phải exit 0
pnpm test        # vitest, phải pass
pnpm lint        # eslint, 0 warning
```

**PR vào `main`**

- Tiêu đề: `[JIRA-KEY] tóm tắt`. Mô tả: link ticket, tóm tắt thay đổi, cách đã self-test, ảnh chụp nếu sửa UI.
- Dán checklist Definition of Done:

```markdown
- [ ] pnpm typecheck clean (api + web)
- [ ] pnpm test pass (new + existing)
- [ ] pnpm lint clean
- [ ] Shared code changed? → all callers updated (additive where possible)
- [ ] Schema changed? → additive migration, generated + tested, local :5433 only
- [ ] Touched a central file? → manually exercised the real flow
- [ ] No --no-verify, no RLS/docker-port changes without sign-off
```

**Vùng nhạy cảm — bắt buộc test tay luồng thật, không chỉ unit test**

| Vùng | Test tay |
| --- | --- |
| Storefront SSR (render checkout, theme engine, store resolver) | Mở store thật + `/checkout` + `/thank-you` |
| Cart / order (cart service, pricing, routes) | Thêm variant → xem giá → đặt hàng; kiểm tra row trong DB |
| Repository (`infrastructure/*.repository.ts`) | Trang list + detail của feature đó |
| Auth / tenant (`require-auth`, `withWorkspace`) | Login + một route cần quyền + thử truy cập workspace khác |
| `packages/shared-types` | `pnpm typecheck` cho cả api và web |

## 6. Review & merge

Lead là người duy nhất accept PR; dev chỉ merge sau khi có approve, và chính dev là người bấm merge.

**Lead review những gì**

- Code khớp với implementation đã viết trong ticket; không sửa ngoài phạm vi.
- GATE xanh, có test cho logic mới.
- Tuân thủ kiến trúc hexagonal và các invariant trong `CLAUDE.md`: lỗi dùng `AppError`, input parse bằng zod, truy
  cập tenant qua `withWorkspace`, tiền dùng helper `money.ts` (không dùng float).
- Migration additive, không xóa/đổi kiểu cột gây mất dữ liệu.

**Khi bị reject**

1. Đọc hết comment, hỏi lại nếu chưa rõ — không đoán.
2. Sửa trên cùng branch, push commit mới (không tạo PR mới, không force-push xóa lịch sử review).
3. Chạy lại GATE, trả lời từng comment, báo lead review lại.
4. Nếu hướng giải quyết thay đổi, cập nhật lại phần implementation trong ticket.

**Khi được accept**

1. Kiểm tra branch không conflict với `main`; có conflict thì rebase/merge `main`, chạy lại GATE rồi mới merge.
2. Merge PR trên GitHub, xóa branch.
3. Xác nhận commit đã có trên `main`.
4. Chuyển ticket sang **Resolved**, comment link PR và ghi chú cho QC (Config/Migration cần chú ý khi deploy).

## 7. Deploy

Dev không deploy: merge vào `main` tự động build image và đẩy lên staging, còn production do lead chạy tay bằng
GitHub Actions. Toàn bộ chi tiết kỹ thuật nằm ở `deploy/README.md` (mục "Staging & the deploy workflow" và "Rolling
back").

**Pipeline hiện tại**

| Bước | Chạy khi nào | Làm gì |
| --- | --- | --- |
| CI (`ci.yml`) | Mỗi PR | typecheck · lint · test |
| Build images (`build-images.yml`) | Mỗi lần merge vào `main` | Chạy lại gate, build image `adlux-api` / `adlux-web` tag = commit SHA, đẩy lên ECR |
| Deploy staging (`deploy.yml`) | Tự động sau build thành công | Deploy SHA đó lên staging + smoke test |
| Deploy production (`deploy.yml`) | Lead bấm tay | Actions → Deploy → Run workflow → `env=prod`, `sha=<commit>` → deploy + smoke test |

**Staging — chưa dựng.** Hiện chưa có instance staging, nên bước deploy staging chỉ báo "no staging instance" và bỏ
qua. Trong giai đoạn này QC verify theo cách lead chỉ định (ví dụ trên máy local của dev/QC với build từ `main`).
Khi cần dựng: `deploy/aws/create-staging.sh` (staging dùng DB và secret riêng, không bao giờ restore dữ liệu
production vào).

**Production — lead deploy**

1. Chọn commit SHA trên `main`. Một SHA chứa **mọi** ticket đã merge trước nó, nên chỉ chọn SHA mà tất cả ticket
   trong đó đã Resolved-Verified. Ticket chưa verify nằm giữa thì phải revert hoặc tắt bằng flag trước.
2. Đọc mục Config và Migration của các ticket: biến môi trường mới phải có trong `.env.production` và đẩy lên SSM
   (`deploy/env-sync.sh push`) **trước** khi deploy.
3. Chạy workflow Deploy với `env=prod`. Workflow từ chối nếu SHA chưa có image (chưa qua gate) hoặc — khi staging
   đã có — staging chưa chạy đúng SHA đó.
4. `deploy.sh` tự backup DB khi có migration mới, chạy migration, rồi thay từng API slot một (blue/green, không
   downtime). Bình thường mất 5–20 phút.
5. Báo QC SHA đã deploy và danh sách ticket để sanity.

**QC sanity trên production.** QC chạy lại các testcase chính của những ticket vừa deploy, cộng luồng sống còn:
login admin, mở một store thật, thêm vào giỏ và vào `/checkout`. Không tạo đơn thật nếu không được lead cho phép.

**Rollback.** Sanity fail → lead chạy lại Deploy với SHA trước đó (image vẫn còn trong ECR), hoặc `--no-build` với
tag `:previous` trên host. Nếu bản lỗi có migration, sửa schema bằng một migration additive mới — không restore dump
trừ khi chấp nhận mất mọi dữ liệu ghi từ lúc deploy.

**Quy tắc an toàn dữ liệu (ưu tiên cao nhất)**

- Migration chỉ được additive. Không sửa/xóa/đổi tên migration đã chạy. Xóa cột hay đổi kiểu làm mất dữ liệu phải
  có lead duyệt + backup trước.
- Dev chỉ chạy migration/seed trên DB local `:5433`. Kiểm tra `DATABASE_URL` trước mọi lệnh ghi.
- Tuyệt đối không chạy `prisma migrate reset`, `db push --force-reset`, `DROP`, `TRUNCATE`, `docker compose down -v`
  trên bất kỳ môi trường nào không phải local.
- Không dán secret (token Meta, Cloudflare, JWT secret, connection string) vào ticket, PR hay chat.

## 8. Checklist nhanh cho dev

Trước khi chuyển ticket sang Resolved, mọi ô dưới đây phải được tích.

- [ ] Ticket ở In-progress và có đủ Solution, Code, Config, Migration, Impact trước khi code
- [ ] Branch tạo từ `main` mới nhất, tên đúng format `SHOPDY-items/SHOPDY-<số ticket>`
- [ ] Chỉ sửa trong phạm vi ticket; caller của code dùng chung đã cập nhật
- [ ] Migration (nếu có) additive, chạy trên DB local `:5433`
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm lint` đều xanh
- [ ] Self-test luồng thật ở local, ghi lại đã test gì
- [ ] PR vào `main` có link ticket + checklist Definition of Done; link PR dán vào ticket
- [ ] Lead đã accept, dev đã merge, commit có trên `main`
- [ ] Ticket chuyển sang Resolved kèm ghi chú cho QC (Config/Migration cần chú ý)

**Tài liệu nên đọc trong repo:** `CLAUDE.md` (quy tắc bắt buộc), `RUNBOOK.md` (setup local), `BOOTSTRAP.md` (khởi
tạo môi trường dev), `docs/VIBE-CODING-PLAYBOOK.md` (kỷ luật build), `deploy/README.md` (deploy & rollback).
