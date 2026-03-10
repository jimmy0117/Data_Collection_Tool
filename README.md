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
- 請先建立並設定 `backend/.env`（例如 `DB_ENGINE`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`、`DB_HOST`、`DB_PORT`）。
- 如果需要建立管理者帳號：

```bash
python manage.py createsuperuser
```
