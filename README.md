# Task Assignments（プロジェクト・工数管理システム）

チーム内のプロジェクト、タスク、アサイン、予定工数・実績工数を一元管理し、メンバーのプロジェクト横断的な負荷状況を可視化するWebシステム。

企画・要件定義から設計、実装、テスト、Docker、CI/CD、AWS、IaC、運用までを一通り経験することを目的とした転職用ポートフォリオとして開発中。

> 現在、企画・要件定義中。本リポジトリはリポジトリ構成（front / back / docker）の雛形段階。

## 構成

```text
.
├── back/     Spring Boot (Java 21, Maven)
├── front/    React + TypeScript (Vite)
└── docker/   docker-compose, 各種Dockerfile
```

## 技術スタック（現時点）

- Backend: Spring Boot 3.5.x / Java 21 / Maven / Spring Data JPA
- Frontend: React 18 / TypeScript / Vite
- DB: PostgreSQL 16
- Infra: Docker / docker-compose（将来的にAWS + IaCを想定）

## ローカル開発（Dockerを使わない場合）

### 1. PostgreSQLを起動

`docker/docker-compose.yml` の postgres サービスのみ起動するか、ローカルにインストール済みのPostgreSQLを利用。
デフォルトで `back/src/main/resources/application.yml` は以下を参照:

```text
DB: workload_manager / workload_manager / workload_manager (localhost:5432)
```

### 2. Backend起動

```bash
cd back
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

`http://localhost:8080/api/health` で疎通確認。

### 3. Frontend起動

```bash
cd front
npm install
npm run dev
```

`http://localhost:5173` にアクセス。`/api` は `vite.config.ts` のproxy設定でbackend(8080)に転送される。

## Dockerでまとめて起動する場合

```bash
cd docker
cp .env.example .env   # 必要に応じて値を編集
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- PostgreSQL: localhost:5432

## 今後の予定

- [ ] 要件定義の完了
- [ ] DB設計（User / Project / ProjectMember / Task / TaskSchedule / WorkLog / BusinessCalendar）
- [ ] 認証・認可（システム管理者 / PL / 一般ユーザー）
- [ ] プロジェクト・タスク・社員管理のCRUD実装
- [ ] カレンダー機能（日・週・月表示、負荷可視化）
- [ ] CI/CD構築
- [ ] AWSデプロイ・IaC化
