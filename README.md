## 快速開始（建議）

在專案根目錄可先安裝後端相依套件：

```bash
pip install -r requirements.txt
```

## 啟動方式

### 前端
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
CREATE DATABASE labor_platform;
CREATE USER labor_user WITH PASSWORD 'your_password';
ALTER ROLE labor_user SET client_encoding TO 'utf8';
ALTER ROLE labor_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE labor_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE labor_platform TO labor_user;
```

3. 複製環境變數範本並填入帳密：

```bash
copy backend\\.env.example backend\\.env
```

### 後端
使用 Django + PostgreSQL（透過 `.env` 設定連線）。

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### 後端注意事項
- 請先建立並設定 `backend/.env`（可由 `backend/.env.example` 複製）。
- 如果需要建立管理者帳號：

```bash
python manage.py createsuperuser
```
