# FlowBot Studio - Setup & Configuration Guide

คู่มือการตั้งค่าและ Configuration สำหรับ FlowBot Studio แพลตฟอร์ม Multi-tenant No-code Chatbot Builder

---

## สารบัญ

1. [ข้อกำหนดเบื้องต้น (Prerequisites)](#1-ข้อกำหนดเบื้องต้น)
2. [การติดตั้งแบบ Local Development](#2-การติดตั้งแบบ-local-development)
3. [การตั้งค่า Environment Variables](#3-การตั้งค่า-environment-variables)
4. [การตั้งค่า Database](#4-การตั้งค่า-database)
5. [การเริ่มต้นใช้งาน Development Server](#5-การเริ่มต้นใช้งาน-development-server)
6. [การตั้งค่าด้วย Docker (Full Stack)](#6-การตั้งค่าด้วย-docker-full-stack)
7. [การตั้งค่า Channel Integrations](#7-การตั้งค่า-channel-integrations)
8. [การฝัง Chat Widget ในเว็บไซต์](#8-การฝัง-chat-widget-ในเว็บไซต์)
9. [การตั้งค่า Production Deployment](#9-การตั้งค่า-production-deployment)
10. [บัญชีทดสอบ (Demo Accounts)](#10-บัญชีทดสอบ)
11. [API Endpoints Reference](#11-api-endpoints-reference)
12. [การแก้ไขปัญหา (Troubleshooting)](#12-การแก้ไขปัญหา)

---

## 1. ข้อกำหนดเบื้องต้น

### Software ที่ต้องติดตั้ง

| Software       | Version ขั้นต่ำ | ดาวน์โหลด                                      |
| -------------- | --------------- | ---------------------------------------------- |
| Node.js        | >= 18.0.0       | https://nodejs.org/                            |
| pnpm           | >= 8.0.0        | https://pnpm.io/installation                   |
| Docker Desktop | latest          | https://www.docker.com/products/docker-desktop |
| Git            | latest          | https://git-scm.com/                           |

### ติดตั้ง pnpm (ถ้ายังไม่ได้ติดตั้ง)

```bash
npm install -g pnpm
```

### ตรวจสอบ Version

```bash
node --version    # >= v18.0.0
pnpm --version    # >= 8.0.0
docker --version  # Docker installed
```

---

## 2. การติดตั้งแบบ Local Development

### 2.1 Clone โปรเจค

```bash
git clone https://github.com/Sakeerin/FlowBot-Studio.git
cd FlowBot-Studio
```

### 2.2 ติดตั้ง Dependencies

```bash
pnpm install
```

คำสั่งนี้จะติดตั้ง dependencies ของทุก packages ใน monorepo:

- `apps/api` - NestJS Backend API
- `apps/web` - Next.js Frontend
- `packages/shared` - Shared types, schemas, utilities
- `packages/widget` - Embeddable chat widget

### 2.3 Build Shared Package

```bash
cd packages/shared
pnpm build
cd ../..
```

### 2.4 เริ่ม Infrastructure Services

เปิด PostgreSQL และ Redis ด้วย Docker:

```bash
docker compose up -d postgres redis
```

ตรวจสอบว่า services ทำงานปกติ:

```bash
docker compose ps
```

ผลลัพธ์ควรแสดง `postgres` และ `redis` ที่มีสถานะ `running (healthy)`:

```
NAME               STATUS                 PORTS
flowbot-postgres   Up (healthy)           0.0.0.0:5432->5432/tcp
flowbot-redis      Up (healthy)           0.0.0.0:6379->6379/tcp
```

---

## 3. การตั้งค่า Environment Variables

### 3.1 สร้างไฟล์ .env

คัดลอกไฟล์ตัวอย่างแล้วแก้ไขค่าตามต้องการ:

```bash
# Root .env (สำหรับ API)
cp .env.example .env

# Web .env
cp apps/web/.env.example apps/web/.env
```

### 3.2 รายละเอียด Environment Variables ทั้งหมด

#### Database

| ตัวแปร         | ค่าตัวอย่าง                                                                      | คำอธิบาย                            |
| -------------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| `DATABASE_URL` | `postgresql://flowbot:flowbot_dev_password@localhost:5432/flowbot?schema=public` | Connection string สำหรับ PostgreSQL |

รูปแบบ: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA`

- **USER**: ชื่อผู้ใช้ database (ค่า default จาก Docker: `flowbot`)
- **PASSWORD**: รหัสผ่าน database (ค่า default จาก Docker: `flowbot_dev_password`)
- **HOST**: `localhost` สำหรับ local, `postgres` สำหรับ Docker network
- **PORT**: `5432` (default PostgreSQL port)
- **DATABASE**: ชื่อ database (ค่า default จาก Docker: `flowbot_db`)

> **หมายเหตุ**: ถ้าใช้ Docker Compose เต็มรูปแบบ ให้ใช้ `postgres` แทน `localhost` สำหรับ HOST

#### Redis

| ตัวแปร      | ค่าตัวอย่าง              | คำอธิบาย                |
| ----------- | ------------------------ | ----------------------- |
| `REDIS_URL` | `redis://localhost:6379` | Connection string Redis |

#### Authentication (JWT)

| ตัวแปร                   | ค่าตัวอย่าง                                  | คำอธิบาย                                                   |
| ------------------------ | -------------------------------------------- | ---------------------------------------------------------- |
| `JWT_SECRET`             | `your-super-secret-jwt-key-min-32-chars`     | Secret สำหรับ sign JWT access token (ต้อง >= 32 ตัวอักษร)  |
| `JWT_REFRESH_SECRET`     | `your-super-secret-refresh-key-min-32-chars` | Secret สำหรับ sign JWT refresh token (ต้อง >= 32 ตัวอักษร) |
| `JWT_EXPIRES_IN`         | `15m`                                        | อายุของ access token (default: 15 นาที)                    |
| `JWT_REFRESH_EXPIRES_IN` | `7d`                                         | อายุของ refresh token (default: 7 วัน)                     |

> **สำคัญ**: สำหรับ Production ต้องเปลี่ยน secret ให้เป็นค่า random ที่ซับซ้อน ห้ามใช้ค่า default

วิธีสร้าง secret ที่ปลอดภัย:

```bash
# Linux/macOS
openssl rand -base64 48

# หรือใช้ Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

#### Encryption

| ตัวแปร           | ค่าตัวอย่าง                        | คำอธิบาย                                                                      |
| ---------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| `ENCRYPTION_KEY` | `your-32-char-encryption-key-here` | AES-256-GCM encryption key สำหรับเข้ารหัส Tool secrets (ต้อง 32 ตัวอักษรพอดี) |

> **สำคัญ**: ต้องเป็น 32 ตัวอักษรพอดี สำหรับ AES-256

วิธีสร้าง encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

#### LINE Channel (Optional)

| ตัวแปร                      | ค่าตัวอย่าง | คำอธิบาย                                        |
| --------------------------- | ----------- | ----------------------------------------------- |
| `LINE_CHANNEL_SECRET`       | `abc123...` | LINE Channel Secret จาก LINE Developers Console |
| `LINE_CHANNEL_ACCESS_TOKEN` | `xyz789...` | LINE Channel Access Token                       |

#### Application

| ตัวแปร     | ค่าตัวอย่าง   | คำอธิบาย                                         |
| ---------- | ------------- | ------------------------------------------------ |
| `NODE_ENV` | `development` | สภาพแวดล้อม: `development`, `production`, `test` |
| `PORT`     | `3001`        | Port ที่ API server ทำงาน                        |

#### CORS & Web URL

| ตัวแปร        | ค่าตัวอย่าง             | คำอธิบาย                                                 |
| ------------- | ----------------------- | -------------------------------------------------------- |
| `CORS_ORIGIN` | `http://localhost:3000` | Origin ที่อนุญาตให้เรียก API (คั่นด้วย `,` ถ้ามีหลายค่า) |
| `WEB_URL`     | `http://localhost:3000` | URL ของ Web frontend (ใช้เป็น fallback CORS)             |

ตัวอย่างสำหรับหลาย origins:

```
CORS_ORIGIN=http://localhost:3000,https://app.yourdomain.com
```

#### Frontend (Web)

| ตัวแปร                | ค่าตัวอย่าง                 | คำอธิบาย                                    |
| --------------------- | --------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | URL ของ Backend API (ต้องมี `/api` ต่อท้าย) |

> **สำคัญ**: ต้องมี `/api` ต่อท้ายเสมอ เนื่องจาก Backend ใช้ global prefix `/api`

### 3.3 ตัวอย่างไฟล์ .env สำหรับ Development

**`.env`** (Root - ใช้โดย API):

```env
DATABASE_URL=postgresql://flowbot:flowbot_dev_password@localhost:5432/flowbot_db?schema=public
REDIS_URL=redis://localhost:6379

JWT_SECRET=flowbot-dev-jwt-secret-min-32-characters-long
JWT_REFRESH_SECRET=flowbot-dev-refresh-secret-min-32-characters-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

ENCRYPTION_KEY=flowbot-dev-encryption-key-32ch

NODE_ENV=development
PORT=3001

CORS_ORIGIN=http://localhost:3000
WEB_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

**`apps/web/.env`**:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NODE_ENV=development
```

---

## 4. การตั้งค่า Database

### 4.1 Generate Prisma Client

```bash
cd apps/api
pnpm prisma:generate
```

### 4.2 รัน Database Migrations

```bash
cd apps/api
pnpm prisma:migrate
```

ระบบจะสร้างตาราง database ทั้งหมดตาม Prisma Schema:

| ตาราง                   | คำอธิบาย                         |
| ----------------------- | -------------------------------- |
| `tenants`               | องค์กร/บริษัท (Multi-tenant)     |
| `users`                 | ผู้ใช้งานระบบ                    |
| `role_assignments`      | การกำหนดบทบาท (RBAC)             |
| `bots`                  | Chatbot                          |
| `bot_versions`          | ประวัติเวอร์ชันของ Bot           |
| `flow_graphs`           | Flow graph (Draft)               |
| `knowledge_collections` | คอลเลกชัน Knowledge Base         |
| `knowledge_sources`     | แหล่งข้อมูล KB (Q&A, Text, File) |
| `knowledge_chunks`      | ชิ้นส่วนข้อมูล KB                |
| `channel_connections`   | การเชื่อมต่อช่องทาง (Web, LINE)  |
| `conversation_sessions` | เซสชันการสนทนา                   |
| `messages`              | ข้อความในการสนทนา                |
| `trace_spans`           | Trace สำหรับ Debug               |
| `handoff_tickets`       | ตั๋วส่งต่อให้ Agent              |
| `tools`                 | External tool integrations       |
| `tool_secrets`          | Secret ของ tool (เข้ารหัส)       |
| `audit_logs`            | บันทึกการตรวจสอบ                 |

### 4.3 Seed ข้อมูลตัวอย่าง (Optional)

```bash
cd apps/api
pnpm prisma:seed
```

Seed จะสร้างข้อมูลตัวอย่าง:

- 2 Tenants (Acme Corporation, Demo Company)
- 4 Users พร้อม Roles
- 2 Bots พร้อม Flow Graphs
- Knowledge Base ตัวอย่าง
- Tool และ Channel Connection ตัวอย่าง

### 4.4 เปิด Prisma Studio (Database GUI)

```bash
cd apps/api
pnpm prisma:studio
```

จะเปิดเว็บ GUI ที่ http://localhost:5555 สำหรับดูและแก้ไขข้อมูลใน database

### 4.5 Reset Database (ล้างข้อมูลทั้งหมด)

```bash
cd apps/api
npx prisma migrate reset
```

> **คำเตือน**: คำสั่งนี้จะลบข้อมูลทั้งหมดแล้ว migrate ใหม่ + seed

---

## 5. การเริ่มต้นใช้งาน Development Server

### 5.1 เริ่มทุกอย่างพร้อมกัน

จาก root directory:

```bash
pnpm dev
```

คำสั่งนี้จะเริ่มทั้ง Web และ API พร้อมกัน:

| Service | URL                          | คำอธิบาย                |
| ------- | ---------------------------- | ----------------------- |
| Web     | http://localhost:3000        | Next.js Frontend Studio |
| API     | http://localhost:3001/api    | NestJS Backend API      |
| Health  | http://localhost:3001/health | Health Check Endpoint   |

### 5.2 เริ่มแยกแต่ละ Service

```bash
# Terminal 1 - API
cd apps/api
pnpm start:dev

# Terminal 2 - Web
cd apps/web
pnpm dev
```

### 5.3 ตรวจสอบว่าระบบทำงานปกติ

1. **Health Check**: เปิด http://localhost:3001/health

```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 42.5,
  "database": "connected"
}
```

2. **Web App**: เปิด http://localhost:3000 จะ redirect ไปหน้า Login

3. **API**: ทดสอบ login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"password123"}'
```

---

## 6. การตั้งค่าด้วย Docker (Full Stack)

### 6.1 เริ่มทุก Services ด้วย Docker Compose

```bash
docker compose up -d
```

จะเริ่ม 4 services:

- `flowbot-postgres` - PostgreSQL 15
- `flowbot-redis` - Redis 7
- `flowbot-api` - NestJS API (port 3001)
- `flowbot-web` - Next.js Web (port 3000)

### 6.2 ตรวจสอบสถานะ

```bash
docker compose ps
docker compose logs -f api   # ดู log ของ API
docker compose logs -f web   # ดู log ของ Web
```

### 6.3 หยุดและลบ Services

```bash
docker compose down           # หยุดทุก services
docker compose down -v        # หยุดและลบ volumes (ล้างข้อมูล database)
```

### 6.4 Rebuild หลังเปลี่ยน Code

```bash
docker compose up -d --build
```

### 6.5 Environment Variables สำหรับ Docker

ค่าต่อไปนี้ถูกกำหนดไว้แล้วใน `docker-compose.yml`:

| ตัวแปร                | ค่า (Docker)                                                                       |
| --------------------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`        | `postgresql://flowbot:flowbot_dev_password@postgres:5432/flowbot_db?schema=public` |
| `REDIS_URL`           | `redis://redis:6379`                                                               |
| `CORS_ORIGIN`         | `http://localhost:3000`                                                            |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api`                                                        |

> **สังเกต**: ใน Docker ใช้ `postgres` เป็น hostname แทน `localhost`

---

## 7. การตั้งค่า Channel Integrations

### 7.1 Web Channel

Web channel ทำงานโดยอัตโนมัติผ่าน Chat Widget ไม่ต้องตั้งค่าเพิ่มเติม

สร้าง Channel Connection ผ่าน API:

```bash
curl -X POST http://localhost:3001/api/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "channel": "web",
    "botId": "YOUR_BOT_ID",
    "config": {
      "publicUrl": "http://localhost:3000"
    }
  }'
```

### 7.2 LINE OA Channel

#### ขั้นตอนที่ 1: สร้าง LINE Channel

1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. สร้าง Provider ใหม่ (หรือเลือกที่มีอยู่)
3. สร้าง **Messaging API Channel**
4. จด **Channel Secret** และ **Channel Access Token**

#### ขั้นตอนที่ 2: ตั้งค่า Environment Variables

เพิ่มใน `.env`:

```env
LINE_CHANNEL_SECRET=your_line_channel_secret_here
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
```

#### ขั้นตอนที่ 3: สร้าง Channel Connection

```bash
curl -X POST http://localhost:3001/api/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "channel": "line",
    "botId": "YOUR_BOT_ID",
    "config": {
      "channelSecret": "YOUR_LINE_CHANNEL_SECRET",
      "channelAccessToken": "YOUR_LINE_CHANNEL_ACCESS_TOKEN"
    }
  }'
```

#### ขั้นตอนที่ 4: ตั้งค่า Webhook URL ใน LINE Console

1. ไปที่ LINE Developers Console > Messaging API
2. ตั้ง Webhook URL เป็น:

```
https://YOUR_DOMAIN/api/webhooks/channel/line
```

3. เปิดใช้ **Use webhook**
4. ปิด **Auto-reply messages** และ **Greeting messages**

> **หมายเหตุ**: สำหรับ development ใช้ ngrok หรือ cloudflared เพื่อสร้าง public URL:
>
> ```bash
> ngrok http 3001
> ```

---

## 8. การฝัง Chat Widget ในเว็บไซต์

### 8.1 วิธีฝังแบบ Script Tag

เพิ่ม script tag ใน HTML ของเว็บไซต์:

```html
<script
  src="https://YOUR_CDN_OR_HOST/widget.js"
  data-api-url="https://api.yourdomain.com/api"
  data-bot-id="YOUR_BOT_ID"
  data-channel-id="YOUR_CHANNEL_CONNECTION_ID"
  data-position="bottom-right"
  data-theme-primary="#007bff"
  data-chat-title="Chat with us"
></script>
```

### 8.2 Configuration Options

| Attribute            | ค่า Default    | คำอธิบาย                                                        |
| -------------------- | -------------- | --------------------------------------------------------------- |
| `data-api-url`       | (required)     | URL ของ FlowBot API                                             |
| `data-bot-id`        | (optional)     | ID ของ Bot ที่จะใช้                                             |
| `data-channel-id`    | (optional)     | ID ของ Channel Connection                                       |
| `data-position`      | `bottom-right` | ตำแหน่ง: `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `data-theme-primary` | `#007bff`      | สีหลักของ widget                                                |
| `data-chat-title`    | `Chat`         | หัวข้อที่แสดงบน chat window                                     |

### 8.3 Programmatic API

```javascript
// เปิด Widget
window.FlowBotWidget?.open();

// ปิด Widget
window.FlowBotWidget?.close();

// ฟัง Event
window.FlowBotWidget?.on('message', (data) => {
  console.log('New message:', data);
});

window.FlowBotWidget?.on('open', () => {
  console.log('Widget opened');
});

window.FlowBotWidget?.on('close', () => {
  console.log('Widget closed');
});

window.FlowBotWidget?.on('error', (data) => {
  console.error('Widget error:', data);
});
```

### 8.4 Build Widget สำหรับ Production

```bash
cd packages/widget
pnpm build
```

ผลลัพธ์จะอยู่ที่ `packages/widget/dist/widget.js` นำไป host บน CDN หรือ static server

---

## 9. การตั้งค่า Production Deployment

### 9.1 Environment Variables สำหรับ Production

```env
# Database - ใช้ managed database service
DATABASE_URL=postgresql://user:password@db-host:5432/flowbot_prod?schema=public&sslmode=require

# Redis - ใช้ managed Redis service
REDIS_URL=redis://:password@redis-host:6379

# Auth - สร้าง secret ที่ซับซ้อนและไม่ซ้ำกัน
JWT_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<random-64-char-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption - สร้าง key 32 ตัวอักษร
ENCRYPTION_KEY=<random-32-char-string>

# App
NODE_ENV=production
PORT=3001

# CORS - ระบุ domain จริง
CORS_ORIGIN=https://app.yourdomain.com
WEB_URL=https://app.yourdomain.com

# Web
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### 9.2 Build สำหรับ Production

```bash
# Build ทุก packages
pnpm build

# หรือ build แยก
cd packages/shared && pnpm build
cd apps/api && pnpm build
cd apps/web && pnpm build
```

### 9.3 เริ่ม Production Server

```bash
# API
cd apps/api
node dist/main.js

# Web
cd apps/web
pnpm start
```

### 9.4 Docker Production Build

```bash
# Build production images
docker build -t flowbot-api --target production -f apps/api/Dockerfile .
docker build -t flowbot-web --target production -f apps/web/Dockerfile .

# Run
docker run -d -p 3001:3001 --env-file .env flowbot-api
docker run -d -p 3000:3000 -e NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api flowbot-web
```

### 9.5 Production Checklist

- [ ] เปลี่ยน `JWT_SECRET` และ `JWT_REFRESH_SECRET` เป็นค่า random ที่ซับซ้อน
- [ ] เปลี่ยน `ENCRYPTION_KEY` เป็นค่า random 32 ตัวอักษร
- [ ] ตั้ง `NODE_ENV=production`
- [ ] ตั้ง `CORS_ORIGIN` เป็น domain จริง
- [ ] ใช้ HTTPS สำหรับทุก URL
- [ ] ใช้ managed PostgreSQL พร้อม SSL
- [ ] ใช้ managed Redis พร้อม authentication
- [ ] ตั้ง database password ที่ซับซ้อน
- [ ] ตั้ง rate limiting ที่เหมาะสม
- [ ] ตั้ง reverse proxy (nginx) สำหรับ SSL termination
- [ ] ตั้ง monitoring และ logging
- [ ] ตั้ง automated backups สำหรับ database

---

## 10. บัญชีทดสอบ

หลังจากรัน `pnpm prisma:seed` จะมีบัญชีทดสอบดังนี้:

### Tenant 1: Acme Corporation

| Email            | Password    | Roles        | คำอธิบาย             |
| ---------------- | ----------- | ------------ | -------------------- |
| admin@acme.com   | password123 | OWNER, ADMIN | ผู้ดูแลระบบ          |
| builder@acme.com | password123 | BUILDER      | ผู้สร้าง Bot         |
| agent@acme.com   | password123 | AGENT        | เจ้าหน้าที่รับเรื่อง |

### Tenant 2: Demo Company

| Email          | Password    | Roles        | คำอธิบาย    |
| -------------- | ----------- | ------------ | ----------- |
| admin@demo.com | password123 | OWNER, ADMIN | ผู้ดูแลระบบ |

### ระบบ Roles (RBAC)

| Role      | สิทธิ์                                             |
| --------- | -------------------------------------------------- |
| `OWNER`   | สิทธิ์ทั้งหมด รวมถึงจัดการ tenant                  |
| `ADMIN`   | จัดการ users, bots, tools, channels, ดู audit logs |
| `BUILDER` | สร้าง/แก้ไข bots, flows, KB, tools                 |
| `AGENT`   | ดู inbox, รับ handoff tickets, ตอบลูกค้า           |
| `VIEWER`  | ดูข้อมูลเท่านั้น                                   |
| `AUDITOR` | ดู audit logs                                      |

---

## 11. API Endpoints Reference

### Authentication

| Method | Endpoint             | คำอธิบาย            | Auth |
| ------ | -------------------- | ------------------- | ---- |
| POST   | `/api/auth/register` | ลงทะเบียนผู้ใช้ใหม่ | No   |
| POST   | `/api/auth/login`    | เข้าสู่ระบบ         | No   |
| POST   | `/api/auth/refresh`  | ต่ออายุ token       | No   |
| POST   | `/api/auth/logout`   | ออกจากระบบ          | Yes  |

### Bots

| Method | Endpoint                   | คำอธิบาย          | Roles                 |
| ------ | -------------------------- | ----------------- | --------------------- |
| GET    | `/api/bots`                | รายการ bots       | BUILDER, ADMIN, OWNER |
| POST   | `/api/bots`                | สร้าง bot ใหม่    | BUILDER, ADMIN, OWNER |
| GET    | `/api/bots/:id`            | ดูรายละเอียด bot  | BUILDER, ADMIN, OWNER |
| PUT    | `/api/bots/:id`            | แก้ไข bot         | BUILDER, ADMIN, OWNER |
| DELETE | `/api/bots/:id`            | ลบ bot            | ADMIN, OWNER          |
| GET    | `/api/bots/:id/draft/flow` | ดู draft flow     | BUILDER, ADMIN, OWNER |
| PUT    | `/api/bots/:id/draft/flow` | บันทึก draft flow | BUILDER, ADMIN, OWNER |
| POST   | `/api/bots/:id/publish`    | เผยแพร่ bot       | BUILDER, ADMIN, OWNER |
| POST   | `/api/bots/:id/rollback`   | ย้อนกลับเวอร์ชัน  | BUILDER, ADMIN, OWNER |

### Runtime

| Method | Endpoint                        | คำอธิบาย              | Auth |
| ------ | ------------------------------- | --------------------- | ---- |
| POST   | `/api/runtime/inbound/:channel` | รับข้อความจาก channel | No   |
| POST   | `/api/runtime/simulate/:botId`  | จำลองการทำงาน bot     | Yes  |

### Knowledge Base

| Method | Endpoint                              | คำอธิบาย                |
| ------ | ------------------------------------- | ----------------------- |
| GET    | `/api/bots/:botId/kb/collections`     | รายการ KB collections   |
| POST   | `/api/bots/:botId/kb/collections`     | สร้าง collection ใหม่   |
| GET    | `/api/bots/:botId/kb/collections/:id` | ดูรายละเอียด collection |
| POST   | `/api/bots/:botId/kb/sources`         | เพิ่มแหล่งข้อมูล        |
| POST   | `/api/bots/:botId/kb/retrieve`        | ค้นหาข้อมูลจาก KB       |
| GET    | `/api/bots/:botId/kb/status`          | สถานะ KB                |

### Handoff (Agent Desk)

| Method | Endpoint                     | คำอธิบาย          |
| ------ | ---------------------------- | ----------------- |
| GET    | `/api/handoff`               | รายการ tickets    |
| GET    | `/api/handoff/alerts`        | SLA alerts        |
| GET    | `/api/handoff/:id`           | รายละเอียด ticket |
| PUT    | `/api/handoff/:id`           | อัปเดต ticket     |
| POST   | `/api/handoff/:id/message`   | ส่งข้อความ        |
| POST   | `/api/handoff/:id/notes`     | เพิ่มบันทึก       |
| POST   | `/api/handoff/:id/tags`      | เพิ่ม tags        |
| DELETE | `/api/handoff/:id/tags/:tag` | ลบ tag            |
| GET    | `/api/handoff/:id/sla`       | สถานะ SLA         |

### Analytics

| Method | Endpoint                            | คำอธิบาย        |
| ------ | ----------------------------------- | --------------- |
| GET    | `/api/analytics/overview`           | ภาพรวม metrics  |
| GET    | `/api/analytics/rollups`            | รายงานรายวัน    |
| GET    | `/api/analytics/logs`               | บันทึกการสนทนา  |
| GET    | `/api/analytics/sessions/:id/trace` | Trace ของเซสชัน |

### Industry Packs

| Method | Endpoint             | คำอธิบาย           |
| ------ | -------------------- | ------------------ |
| GET    | `/api/packs`         | รายการ packs ที่มี |
| GET    | `/api/packs/:id`     | รายละเอียด pack    |
| POST   | `/api/packs/install` | ติดตั้ง pack       |

### Health Check

| Method | Endpoint        | คำอธิบาย             | Auth |
| ------ | --------------- | -------------------- | ---- |
| GET    | `/health`       | สถานะระบบ + database | No   |
| GET    | `/health/ready` | Readiness probe      | No   |
| GET    | `/health/live`  | Liveness probe       | No   |

### Webhooks

| Method | Endpoint                         | คำอธิบาย                | Auth      |
| ------ | -------------------------------- | ----------------------- | --------- |
| POST   | `/api/webhooks/channel/:channel` | รับ webhook จาก channel | Signature |

---

## 12. การแก้ไขปัญหา

### Port ถูกใช้งานอยู่แล้ว

```bash
# ตรวจสอบว่ามีอะไรใช้ port อยู่
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# macOS/Linux
lsof -i :3000
lsof -i :3001
```

แก้ไขโดยเปลี่ยน port ในไฟล์ `.env`

### เชื่อมต่อ Database ไม่ได้

1. ตรวจสอบว่า Docker containers ทำงาน:

```bash
docker compose ps
docker compose logs postgres
```

2. ตรวจสอบ `DATABASE_URL` ใน `.env`
3. ตรวจสอบว่าชื่อ database ตรงกัน (`flowbot` vs `flowbot_db`)
4. ลองเชื่อมต่อ database ด้วย psql:

```bash
docker compose exec postgres psql -U flowbot -d flowbot_db
```

### Prisma Client Not Found

```bash
cd apps/api
pnpm prisma:generate
```

### Module Resolution Issues

```bash
# Rebuild shared package
cd packages/shared
pnpm build

# ลบ node_modules แล้วติดตั้งใหม่
cd ../..
rm -rf node_modules apps/api/node_modules apps/web/node_modules
pnpm install
```

### API ส่ง 401 Unauthorized ตลอด

1. ตรวจสอบว่า `JWT_SECRET` ใน `.env` ตรงกับที่ใช้ตอน login
2. ตรวจสอบว่า access token ยังไม่หมดอายุ
3. ตรวจสอบรูปแบบ Authorization header: `Bearer YOUR_TOKEN`

### Seed ล้มเหลว

อาจเกิดจากข้อมูลซ้ำ ลอง reset database:

```bash
cd apps/api
npx prisma migrate reset
```

### Docker Build ช้ามาก

เพิ่ม `.dockerignore`:

```
node_modules
.next
dist
coverage
.git
```

### CORS Error

ตรวจสอบว่า `CORS_ORIGIN` ใน `.env` ตรงกับ URL ของ frontend (รวม protocol และ port):

```env
CORS_ORIGIN=http://localhost:3000
```

---

## คำสั่งที่ใช้บ่อย (Cheat Sheet)

```bash
# === Development ===
pnpm dev                              # เริ่ม dev server ทั้ง web + api
pnpm build                            # Build ทุก packages
pnpm lint                             # ตรวจสอบ code
pnpm format                           # จัดรูปแบบ code
pnpm test                             # รัน tests
pnpm type-check                       # ตรวจสอบ TypeScript types

# === Docker ===
docker compose up -d                   # เริ่มทุก services
docker compose up -d postgres redis    # เริ่มเฉพาะ infrastructure
docker compose down                    # หยุดทุก services
docker compose logs -f api             # ดู API logs
docker compose ps                      # ดูสถานะ services

# === Database ===
cd apps/api
pnpm prisma:generate                   # Generate Prisma client
pnpm prisma:migrate                    # รัน migrations
pnpm prisma:seed                       # Seed ข้อมูลตัวอย่าง
pnpm prisma:studio                     # เปิด Database GUI
npx prisma migrate reset               # Reset database

# === Production ===
pnpm build                             # Build ทุก packages
cd apps/api && node dist/main.js       # เริ่ม API production
cd apps/web && pnpm start              # เริ่ม Web production
```
