# Bhubaneswar Engineering College (BEC)
## Production Deployment Manual for Hostinger (Node.js & MySQL)

This guide provides end-to-end instructions for deploying the **BEC Accounts & Finance Management System** on Hostinger Web Hosting or Cloud Hosting.

---

## 1. Prerequisites on Hostinger
- Hostinger Web Hosting (Business plan or higher) OR Hostinger Cloud/VPS Hosting with Node.js support enabled in hPanel.
- Access to **hPanel** (Hostinger Control Panel).
- Domain or Subdomain mapped to your Hostinger account (e.g. `accounts.bec.ac.in` or `finance.bec.ac.in`).

---

## 2. Step 1: Create Hostinger MySQL Database
1. Log in to **Hostinger hPanel**.
2. Navigate to **Databases** &rarr; **MySQL Databases**.
3. Under **Create a New MySQL Database and User**:
   - **Database Name**: Enter database suffix, e.g., `bec_finance` (Full name will look like `u123456789_bec_finance`).
   - **Username**: Enter username, e.g., `bec_admin` (Full name will look like `u123456789_bec_admin`).
   - **Password**: Generate a strong password (minimum 16 characters with symbols and digits).
   - Click **Create**.
4. Note down the following details:
   - **DB Host**: `localhost` (Hostinger internal host) or the IP shown in hPanel.
   - **DB Port**: `3306`
   - **DB Name**: `u123456789_bec_finance`
   - **DB User**: `u123456789_bec_admin`
   - **DB Password**: *(your generated password)*

---

## 3. Step 2: Import Database Schema & Baseline Seeds
1. In hPanel, find your newly created database in the list and click **Enter phpMyAdmin**.
2. Select your database from the left-hand menu.
3. Click the **Import** tab in the top navigation bar.
4. Click **Choose File** and select `database/schema.sql` from your project folder.
5. Click **Import** at the bottom of the page.
6. Once the schema is imported successfully (28 tables created), repeat the import step for `database/seed.sql`.
7. Verify that tables (`users`, `roles`, `students`, `invoices`, `payments`, `receipts`, etc.) are populated.

---

## 4. Step 3: Setup Node.js Application in hPanel
1. In hPanel, search for or navigate to **Advanced** &rarr; **Node.js**.
2. Click **Create Application**:
   - **Node.js Version**: Select **v20.x LTS** or **v22.x LTS**.
   - **Application Mode**: Select **Production**.
   - **Application Root**: `public_html/bec_account` (or `public_html` if this is your primary domain).
   - **Application Startup File**: `backend/server.js`.
   - **Application URL**: Select your domain or subdomain (e.g. `https://accounts.bec.ac.in`).
3. Click **Create**.

---

## 5. Step 4: Upload Project Files
You can upload using Git or Hostinger File Manager:

### Method A: Git Deployment (Recommended)
1. Push your code to your private GitHub repository (ensuring `.gitignore` excludes `.env` and `node_modules`).
2. In hPanel &rarr; **Advanced** &rarr; **Git**, connect your repository to `public_html/bec_account`.
3. Click **Deploy**.

### Method B: File Manager / FTP
1. Zip the project files: include `backend/`, `frontend/`, `database/`, and `package.json`.
2. Do **NOT** upload `node_modules`.
3. In hPanel &rarr; **File Manager**, navigate to `public_html/bec_account` and upload the zip file.
4. Extract the zip archive.

---

## 6. Step 5: Install NPM Dependencies
1. Open the Hostinger **SSH Terminal** or the **NPM** button inside the Node.js application card in hPanel.
2. In terminal, navigate to the backend directory:
   ```bash
   cd public_html/bec_account/backend
   npm install --production
   ```

---

## 7. Step 6: Configure Production Environment Variables (.env)
Create a `.env` file in the `backend/` directory (`public_html/bec_account/backend/.env`).
Populate it with your live Hostinger credentials:

```env
# Server
PORT=5000
NODE_ENV=production
BASE_URL=https://accounts.bec.ac.in

# Hostinger MySQL Connection
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u123456789_bec_finance
DB_USER=u123456789_bec_admin
DB_PASSWORD=YourStrongDatabasePasswordHere
DB_CONNECTION_LIMIT=25
DB_WAIT_FOR_CONNECTIONS=true
DB_QUEUE_LIMIT=0

# JWT Authentication
JWT_SECRET=super_secret_high_entropy_jwt_key_bec_2026_hostinger
JWT_EXPIRES_IN=8h

# Payment Gateway Configuration
PAYMENT_GATEWAY_PROVIDER=MOCK
PAYMENT_GATEWAY_KEY=rzp_live_placeholder
PAYMENT_GATEWAY_SECRET=rzp_live_secret
PAYMENT_WEBHOOK_SECRET=rzp_webhook_secret

# Institutional Information
COLLEGE_NAME=Bhubaneswar Engineering College
COLLEGE_CODE=BEC
COLLEGE_AFFILIATION=Affiliated to BPUT, Odisha & Approved by AICTE
COLLEGE_EMAIL=accounts@bec.ac.in
COLLEGE_PHONE=+91-674-2970000
```

> **Security Warning**: Set file permissions of `backend/.env` to `600` (read/write only for owner) in File Manager.

---

## 8. Step 7: Restart Node.js Application & Enable HTTPS
1. In hPanel &rarr; **Node.js**, click **Restart Application**.
2. In hPanel &rarr; **Security** &rarr; **SSL**, ensure that **Free Let's Encrypt SSL** is active on your domain.
3. Toggle **Force HTTPS** to ON.
4. Open your domain in the browser: `https://accounts.bec.ac.in`.
5. The login page will appear. Test login with initial administrative or student credentials.

---

## 9. Baseline Production Credentials (Change Immediately Upon Deployment)

| Role | Email | Password | Required Action |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@bec.ac.in` | `Admin@BEC2026!` | Change in Settings |
| **Accounts Head** | `accounts.head@bec.ac.in` | `Head@BEC2026!` | Change in Settings |
| **Accounts Staff** | `accounts.staff@bec.ac.in` | `Staff@BEC2026!` | Change in Settings |
| **Auditor** | `auditor@bec.ac.in` | `Auditor@BEC2026!` | Read-Only |
| **Test Student** | `jitendranial@bec.ac.in` | `Student@BEC2026!` | Student Portal |

---

## 10. Troubleshooting Common Hostinger Errors

### 1. `503 Service Unavailable` or `Application Failed to Start`
- **Cause**: Port mismatch or startup file error.
- **Fix**: Verify that **Application Startup File** in hPanel is set to `backend/server.js`. Check the application logs in hPanel or run `node backend/server.js` directly in SSH to see any missing modules.

### 2. `Database connection refused / ER_ACCESS_DENIED_ERROR`
- **Cause**: Incorrect database credentials or user not granted permissions.
- **Fix**: In hPanel &rarr; **MySQL Databases**, ensure the user `u123456789_bec_admin` has "ALL PRIVILEGES" on `u123456789_bec_finance`. Ensure `DB_HOST=localhost` in `backend/.env`.

### 3. `CORS Policy Blocked`
- **Cause**: Domain mismatch in frontend requests.
- **Fix**: Because `backend/server.js` serves both the static frontend and the REST API from the same port/origin, no CORS errors occur when accessing via domain. Ensure `BASE_URL` in `.env` matches your live domain.

### 4. `File Upload or Database Import Timeout`
- **Cause**: phpMyAdmin max upload size.
- **Fix**: In hPanel, run the migration runner via SSH:
  ```bash
  cd public_html/bec_account
  node database/init_db.js
  ```
