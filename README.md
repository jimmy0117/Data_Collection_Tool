## 快速開始（建議）

在專案根目錄可先安裝後端相依套件：

```bash
pip install -r requirements.txt
```

## 啟動方式

### 前端
安裝node js
```bash
# 下載並安裝 nvm：
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# 不想重新啟動 shell 時，執行：
\. "$HOME/.nvm/nvm.sh"

# 下載並安裝 Node.js：
nvm install 24

# Verify the Node.js version:
node -v # Should print "v24.14.1".

# 核對 npm 版本：
npm -v # 應會印出 "11.11.0"。
```

使用 Vite + React。clone 後執行以下指令：

```bash
cd frontend
npm install
npm run dev
```

### PostgreSQL 建置（本機）

1. 安裝 PostgreSQL 並確認可使用 `psql`。
2. 建立資料庫與使用者（請先以 postgres 帳號登入）：

```sql
CREATE DATABASE platform;
CREATE USER user WITH PASSWORD 'your_password';
ALTER ROLE user SET client_encoding TO 'utf8';
ALTER ROLE user SET default_transaction_isolation TO 'read committed';
ALTER ROLE user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE platform TO user;
```

3. 複製環境變數範本並填入帳密：

```bash
copy backend\\.env.example backend\\.env
```

### SQLite（免安裝 DB，快速起步）

1. 在 `backend/.env` 設定：

```env
DB_BACKEND=sqlite
SQLITE_NAME=db.sqlite3  # 可省略，預設 db.sqlite3
```
2. 執行遷移與啟動（同下方後端步驟即可）。

### 後端
使用 Django（透過 `.env` 指定 PostgreSQL 或 SQLite 連線）。
可參考從`.env.example`去做更改。

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations api
python manage.py migrate
python manage.py runserver
```

#### 後端注意事項
- 請先建立並設定 `backend/.env`（可由 `backend/.env.example` 複製）。
- 選 PostgreSQL：`DB_BACKEND=postgresql`（預設值），並依序填 `DB_NAME/DB_USER/DB_PASSWORD/DB_HOST/DB_PORT`。
- 選 SQLite：`DB_BACKEND=sqlite` 即可，不需額外安裝資料庫。
- 如果需要建立管理者帳號：

```bash
python manage.py createsuperuser
```
