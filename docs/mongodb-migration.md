# MongoDB移行準備メモ

## 追加したもの

- Mongo接続設定モジュール  
  `storage/config.js`
- Mongoクライアントヘルパー  
  `storage/mongo-client.js`
- 接続確認スクリプト  
  `npm run mongo:ping`
- JSON -> Mongo移行スクリプト  
  `npm run mongo:migrate`

## 対象データ

- `logs/battle-memo.json` -> `app_state` (`_id: "battle-memo"`)
- `logs/battle-state.json` -> `app_state` (`_id: "battle-state"`)
- `logs/character-profiles.json` -> `app_state` (`_id: "character-profiles"`)
- `logs/skill-set-presets.json` -> `app_state` (`_id: "skill-set-presets"`)
- `logs/select_dataLog.txt` -> `app_logs` (`_id: "select_data_log"`)

## 事前設定

PowerShell例:

```powershell
$env:MONGODB_URI="mongodb://127.0.0.1:27017"
$env:MONGODB_DB="my_trpg_app"
```

## 実行手順

1. 接続確認:

```powershell
npm run mongo:ping
```

2. ドライラン:

```powershell
npm run mongo:migrate -- --dry-run
```

3. 実移行:

```powershell
npm run mongo:migrate
```

4. DB名を変える場合:

```powershell
npm run mongo:migrate -- --db my_trpg_app_dev
```

## 次ステップ（実切替）

1. `routes/api.js` の `read*/write*` 関数をストレージインターフェース化  
2. `USE_MONGODB=true` 時は Mongo 実装を使う  
3. 旧JSONへのフォールバック方針（読み込みのみ許可など）を決める  
4. バックアップ／ロールバック手順を固定する

## 実行時切替（現状）

- `USE_MONGODB=true` かつ `MONGODB_URI` 設定時:
  - `User` / `Character` / `ItemList` は MongoDB 優先で取得
  - それ以外（クラス、スキル、ショップ等）は Excel 取得
- `USE_MONGODB=false`（既定）:
  - 従来どおり Excel 取得

## 1アクション起動

1. `.env.mongodb.local` を作成（`.env.mongodb.local.example` を参考）
2. 1コマンドで起動:

```powershell
# 本番相当（prestart -> build含む）
npm run start:mongo

# API開発モード（buildなし）
npm run dev:api:mongo
```

`start:mongo` は内部で `mongo:ping` を先に実行し、接続確認後にサーバー起動します。

## Excel一部移行メモ（2026-04-18）

- `キャラクター` シート -> `Character` コレクション
- `userID` シート -> `User` コレクション
- `装備` シート -> `ItemList` コレクション

`ItemList` は当面、以下の列のみ移行対象:

- `名前`
- `フリガナ`
- `魔法1`
- `魔法2`
- `魔法3`
- `素材1`
- `量1`
- `素材2`
- `量2`
- `素材3`
- `量3`
- `素材4`
- `量4`

### 実行コマンド

Excel移行スクリプトは削除済み。
現在は JSON 移行のみ対応:

```powershell
npm run mongo:migrate
```

### 変換ルール

- `キャラクター` -> `Character`
  - 除外列: `取得魔法`, `スキル`, `耐性:技能値`, `弱点`
- `userID` -> `User`
- `装備` -> `ItemList`
  - 対象列: `名前`, `フリガナ`, `魔法1`, `魔法2`, `魔法3`, `素材1`, `量1`, `素材2`, `量2`, `素材3`, `量3`, `素材4`, `量4`
