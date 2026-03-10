## 此專案為前後端分離架構

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
python3 -m venv 環境名稱
source 環境名稱/bin/activate
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