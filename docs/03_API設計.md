# 1. 本ドキュメントの位置づけ

`01_企画・要件定義.md`（機能要件）と`02_DB設計.md`（データ構造）を踏まえて、REST APIのエンドポイント・リクエスト/レスポンス・認可方針を定義する。

フロントエンド（React）は基本的に本ドキュメントのAPIのみを通じてバックエンドとやり取りする想定。

---

# 2. 共通仕様

## 2.1 ベースURL・認証方式

- ベースURL：`/api`（バージョニングなし。既存の`/api/health`に合わせる）
- 認証方式：**セッション（Cookie）方式**。Spring Securityの標準セッション管理を利用する。
  - ログイン成功時にサーバー側でセッションを開始し、`JSESSIONID`をCookieでブラウザに返す。
  - 以降のリクエストはブラウザが自動でCookieを送信するため、フロントエンド側でトークン管理は不要。
  - 未認証で保護されたAPIにアクセスした場合は`401 Unauthorized`。

## 2.2 共通仕様（リクエスト/レスポンス）

- Content-Type: `application/json`（リクエストボディを持つPOST/PUT/PATCH）
- 文字コード: UTF-8

## 2.3 エラーレスポンス共通形式

全APIで以下の形式に統一する。

```json
{
  "code": "VALIDATION_ERROR",
  "message": "入力内容に誤りがあります",
  "errors": [
    { "field": "email", "message": "メールアドレスの形式が不正です" }
  ]
}
```

- `code`：機械可読なエラー種別（例：`VALIDATION_ERROR` / `UNAUTHORIZED` / `FORBIDDEN` / `NOT_FOUND` / `CONFLICT` / `INTERNAL_ERROR`）
- `message`：人が読むための概要メッセージ
- `errors`：フィールド単位のバリデーションエラー一覧（該当しない場合は省略可）

### HTTPステータスコード方針

| ステータス | 用途 |
|---|---|
| 200 | 取得・更新成功 |
| 201 | 作成成功 |
| 204 | 削除等、レスポンスボディなしの成功 |
| 400 | リクエスト不正・バリデーションエラー |
| 401 | 未認証（未ログイン、またはセッション切れ） |
| 403 | 認可エラー（ログイン済みだが権限不足） |
| 404 | リソースが存在しない |
| 409 | 一意制約違反等のコンフリクト（例：email重複） |
| 500 | サーバー内部エラー |

## 2.4 ページング共通形式

一覧系APIは最初からオフセットベースのページングを採用する。クエリパラメータ・レスポンスともSpring Data の `Page` に準拠した形式とする。

**クエリパラメータ**

| パラメータ | 型 | デフォルト | 説明 |
|---|---|---|---|
| page | int | 0 | 0始まりのページ番号 |
| size | int | 20 | 1ページあたりの件数 |
| sort | string | （API毎に既定値） | 例：`name,asc` |

**レスポンス**

```json
{
  "content": [ /* 要素の配列 */ ],
  "page": 0,
  "size": 20,
  "totalElements": 123,
  "totalPages": 7
}
```

## 2.5 日付・日時形式

- 日付のみ（`date`）：`YYYY-MM-DD`（例：`2026-10-01`）
- 日時（`timestamp`）：ISO 8601（例：`2026-10-01T09:00:00+09:00`）

## 2.6 マスキングの表現方法

非所属プロジェクトの情報マスキング（要件定義7章）は、APIのレスポンス生成時点でマスキング対象フィールドの値そのものを`"****"`に置き換えてから返す方式とする。

- マスキング対象：プロジェクト名（`name`）、説明（`description`）、タスク名等の内部情報フィールド。
- マスキング対象外：予定工数・実績工数等、負荷把握に必要な数値、および`hasUnassignedTasks`のようなフラグ類（そのまま返す）。
- `null`ではなく文字列`"****"`を返す（フロントエンドはマスキングの有無を判定する専用フラグを見る必要がなく、返ってきた値をそのまま表示すればよい）。
- 実装方針：マスキング処理は各Controller/Service個別に埋め込まず、共通のUtilクラス（例：`MaskingUtil`）に切り出し、非所属プロジェクト向けのレスポンス生成時に一律で適用する。

---

# 3. 認証API

| Method | Path | 概要 | 認可 |
|---|---|---|---|
| POST | /api/auth/login | ログイン | 誰でも |
| POST | /api/auth/logout | ログアウト | 認証済み |
| GET | /api/auth/me | ログイン中のユーザー情報取得 | 認証済み |

### POST /api/auth/login

リクエスト：

```json
{ "email": "taro@example.com", "password": "初期パスワードまたは設定済みパスワード" }
```

レスポンス（200）：

```json
{ "id": 1, "name": "山田太郎", "email": "taro@example.com", "role": "MEMBER" }
```

失敗時（401）：`code: "UNAUTHORIZED"`、メールアドレスまたはパスワードが不正な旨のメッセージ。

### GET /api/auth/me

レスポンス（200）：ログイン中ユーザーの`id / name / email / role`。未ログインは401。

---

# 4. 社員（User）API

| Method | Path | 概要 | 認可 |
|---|---|---|---|
| GET | /api/users | 社員一覧（ページング） | 認証済み全員 |
| GET | /api/users/{id} | 社員詳細 | 認証済み全員 |
| POST | /api/users | 社員登録（初期パスワード自動発行） | SYSTEM_ADMIN |
| PUT | /api/users/{id} | 社員情報更新（name/email） | SYSTEM_ADMIN |
| PATCH | /api/users/{id}/role | 権限変更 | SYSTEM_ADMIN |
| DELETE | /api/users/{id} | 論理削除 | SYSTEM_ADMIN |
| POST | /api/users/{id}/restore | 社員復活（論理削除の取り消し） | SYSTEM_ADMIN |

- 一覧・詳細取得は、タスク担当者やプロジェクトメンバーを選ぶプルダウン等で全員が使うため、認証済みなら誰でも取得可とする（`is_deleted=true`の社員はデフォルトで一覧から除外）。
- `POST /api/users`のレスポンスには、生成した初期パスワードを**このレスポンス限りで平文で含める**（`temporaryPassword`フィールド）。管理者はこれを画面で確認し、口頭等で本人に共有する。DBには保存しない（ハッシュのみ保存）。
- `DELETE /api/users/{id}`：システム管理者が実行後に有効な`SYSTEM_ADMIN`が1名未満になる場合は`409 CONFLICT`で拒否する（要件定義4章「システム管理者は最低2名」の担保）。
- `POST /api/users/{id}/restore`：`is_deleted`を`false`に戻す。emailは変更しない（同じemailで復活する想定）。

### POST /api/users レスポンス例（201）

```json
{
  "id": 10,
  "name": "鈴木花子",
  "email": "hanako@example.com",
  "role": "MEMBER",
  "temporaryPassword": "aB3xQ9kZ"
}
```

---

# 5. プロジェクト（Project）API

| Method | Path | 概要 | 認可 |
|---|---|---|---|
| GET | /api/projects | プロジェクト一覧（ページング、マスキング適用） | 認証済み全員 |
| GET | /api/projects/{id} | プロジェクト詳細（マスキング適用） | 認証済み全員 |
| POST | /api/projects | プロジェクト作成 | SYSTEM_ADMIN, PL |
| PUT | /api/projects/{id} | プロジェクト更新 | SYSTEM_ADMIN, PL |
| DELETE | /api/projects/{id} | 論理削除 | SYSTEM_ADMIN, PL |

- 作成・更新・論理削除は`SYSTEM_ADMIN`, `PL`いずれも可能とする。
- 「削除」は現状DBの論理削除のみを指す。将来的に物理削除（完全消去）機能を追加する場合は、その操作は`SYSTEM_ADMIN`限定とする想定（現時点ではAPI未定義）。

### GET /api/projects/{id} レスポンス例

所属メンバーの場合（`visibility: "FULL"`）：

```json
{
  "id": 5,
  "name": "ECサイトリニューアル",
  "description": "既存ECサイトのフルリニューアル案件",
  "hasUnassignedTasks": true,
  "createdAt": "2026-04-01T10:00:00+09:00"
}
```

- `hasUnassignedTasks`：このプロジェクト配下に未アサイン（`assignee_id IS NULL`）のタスクが1件以上存在するかどうかのフラグ。フロントエンドはこれを拾ってプロジェクト一覧・詳細画面に警告アラートを表示する（要件定義6.5章）。

非所属メンバーの場合（マスキング適用）：

```json
{
  "id": 5,
  "name": "****",
  "description": "****",
  "hasUnassignedTasks": true,
  "createdAt": "2026-04-01T10:00:00+09:00"
}
```

- `hasUnassignedTasks`はマスキング対象外（非所属プロジェクトでも負荷把握のため表示する数値・フラグ類の一種として扱う）。

---

# 6. プロジェクトメンバー（ProjectMember）API

| Method | Path | 概要 | 認可 |
|---|---|---|---|
| GET | /api/projects/{projectId}/members | メンバー一覧 | プロジェクトメンバー or SYSTEM_ADMIN |
| POST | /api/projects/{projectId}/members | メンバー追加 | SYSTEM_ADMIN, PL |
| DELETE | /api/projects/{projectId}/members/{userId} | メンバー削除 | SYSTEM_ADMIN, PL |

- 非所属者が`GET`した場合は`403 FORBIDDEN`（メンバー一覧自体が内部情報のため、マスキングではなくアクセス拒否とする想定）。
- プロジェクトAPI（5章）と同じ方針：追加・削除ともに`SYSTEM_ADMIN`, `PL`いずれも可能とする。

### POST /api/projects/{projectId}/members

```json
{ "userId": 12 }
```

レスポンス（201）：`{ "projectId": 5, "userId": 12, "joinedAt": "..." }`

---

# 7. タスク（Task）API

| Method | Path | 概要 | 認可 |
|---|---|---|---|
| GET | /api/projects/{projectId}/tasks?status=&assigneeId= | タスク一覧（ページング、ステータス・担当者で絞り込み可、マスキング適用） | 認証済み全員 |
| GET | /api/tasks/{id} | タスク詳細（マスキング適用） | 認証済み全員 |
| POST | /api/projects/{projectId}/tasks | タスク作成（TaskSchedule自動生成） | プロジェクトメンバー or SYSTEM_ADMIN |
| PUT | /api/tasks/{id} | タスク更新（日程・工数変更時はTaskSchedule再生成） | プロジェクトメンバー or SYSTEM_ADMIN |
| DELETE | /api/tasks/{id} | 論理削除 | プロジェクトメンバー or SYSTEM_ADMIN |

### POST /api/projects/{projectId}/tasks

リクエスト：

```json
{
  "name": "詳細設計書作成",
  "assigneeId": 12,
  "startDate": "2026-10-01",
  "dueDate": "2026-10-07",
  "plannedHours": 20
}
```

- `assigneeId`は省略可（未アサイン状態で作成）。
- 作成時、`startDate`〜`dueDate`の営業日（`PublicHoliday`/`CompanyHoliday`を除いた平日）に`plannedHours`を均等配分した`TaskSchedule`を自動生成する。

レスポンス（201）：作成されたTaskの内容（`id / projectId / name / assigneeId / startDate / dueDate / plannedHours / status / createdAt`等）。

### PUT /api/tasks/{id}

- `startDate` / `dueDate` / `plannedHours`のいずれかが変更された場合、既存の`TaskSchedule`を全削除して再生成する（02_DB設計.mdの方針どおり）。
- `assigneeId`のみの変更（担当者変更）では`TaskSchedule`は再生成しない。

---

# 8. 実績工数（WorkLog）API

| Method | Path | 概要 | 認可 |
|---|---|---|---|
| GET | /api/tasks/{taskId}/work-logs | 指定タスクの実績一覧 | プロジェクトメンバー or SYSTEM_ADMIN |
| POST | /api/tasks/{taskId}/work-logs | 実績記録の追加 | プロジェクトメンバー or SYSTEM_ADMIN |
| PUT | /api/work-logs/{id} | 実績記録の更新 | 記録者本人, PL, SYSTEM_ADMIN |
| DELETE | /api/work-logs/{id} | 実績記録の削除 | 記録者本人, PL, SYSTEM_ADMIN |

### POST /api/tasks/{taskId}/work-logs

```json
{ "userId": 12, "workDate": "2026-10-01", "hours": 4, "note": "午前" }
```

- `userId`を省略した場合はログイン中のユーザー自身の実績として記録する。
- 実績記録の更新・削除は記録者本人に限定せず、PL・SYSTEM_ADMINも操作可能とする（進捗確認や修正代行のため）。
- 同一タスク・同一日で複数件登録可（ユニーク制約なし、02_DB設計.md 3.6節どおり）。

---

# 9. カレンダー・負荷集計API

要件定義6.5章（カレンダー機能）を実現するための集計API。UserごとにDB上のWorkLog/TaskScheduleを日別・プロジェクト横断で集計して返す、本システムの中核API。

| Method | Path | 概要 | 認可 |
|---|---|---|---|
| GET | /api/calendar/load | 期間・ユーザー指定で日別の予定/実績工数を集計取得 | 認証済み全員（結果はマスキング適用） |

### GET /api/calendar/load

クエリパラメータ：

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| from | date | ○ | 集計開始日 |
| to | date | ○ | 集計終了日 |
| userId | long | - | 指定ユーザーのみに絞る（省略時はログインユーザーがアクセス可能な全ユーザー） |

レスポンス例：

```json
{
  "from": "2026-10-01",
  "to": "2026-10-07",
  "users": [
    {
      "userId": 12,
      "userName": "山田太郎",
      "days": [
        {
          "date": "2026-10-01",
          "plannedHours": 8,
          "actualHours": 7,
          "projects": [
            { "projectId": 5, "projectName": "ECサイトリニューアル", "plannedHours": 4, "actualHours": 3 },
            { "projectId": 9, "projectName": "****", "plannedHours": 4, "actualHours": 4 }
          ]
        }
      ]
    }
  ]
}
```

- 未アサイン（`assignee_id IS NULL`）のタスクはどのユーザーの`days`にも計上しない。未アサインタスクの有無は、プロジェクトAPI（5章）の`hasUnassignedTasks`フラグをフロントエンドが拾って警告表示する。

---

# 10. 休日（Holiday）API

| Method | Path | 概要 | 認可 |
|---|---|---|---|
| GET | /api/holidays/public | 祝日一覧（期間指定） | 認証済み全員 |
| POST | /api/holidays/public | 祝日登録 | SYSTEM_ADMIN |
| GET | /api/holidays/public/{id} | 祝日詳細 | SYSTEM_ADMIN |
| PUT | /api/holidays/public/{id} | 祝日更新 | SYSTEM_ADMIN |
| DELETE | /api/holidays/public/{id} | 祝日削除 | SYSTEM_ADMIN |
| GET | /api/holidays/company | 会社独自休日一覧（期間指定） | 認証済み全員 |
| POST | /api/holidays/company | 会社独自休日登録 | SYSTEM_ADMIN |
| GET | /api/holidays/company/{id} | 会社独自休日詳細 | SYSTEM_ADMIN |
| PUT | /api/holidays/company/{id} | 会社独自休日更新 | SYSTEM_ADMIN |
| DELETE | /api/holidays/company/{id} | 会社独自休日削除 | SYSTEM_ADMIN |

一覧系は`from`/`to`クエリパラメータで期間を絞り込む（休日データは性質上、全期間分を返す必要が薄いため）。個別編集ができるよう、`GET`（単体）・`PUT`をプロジェクト/タスク/社員と同様に用意する（追加時に日付を間違えた場合、削除して登録し直すのではなく直接編集できるようにするため）。

---

# 11. 未確定・要確認事項まとめ

現時点で未確定の項目はなし。以下は本ドキュメントでの確定事項の一覧。

- マスキング方式（2.6節）：マスキング対象フィールドの値を`"****"`に置き換えて返す（`visibility`のような専用フラグは設けない）。
- プロジェクトの作成・更新・論理削除はいずれも`SYSTEM_ADMIN`, `PL`が可能。
- プロジェクトメンバーの追加・削除はいずれも`SYSTEM_ADMIN`, `PL`が可能。
- WorkLogの更新・削除は記録者本人に加え、`PL`, `SYSTEM_ADMIN`も可能。
- 未アサインタスクの警告は、プロジェクトAPI（5章）の`hasUnassignedTasks`フラグをフロントエンドが利用して表示する（専用APIは設けない）。
