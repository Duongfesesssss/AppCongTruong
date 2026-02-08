# App Cong Truong

Ung dung quan ly cong truong theo mo hinh ban ve + pin/task + anh + khoanh vung + export.

## Yeu cau

- Node.js 18+
- MongoDB

## Chay dev

### Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### Khoi tao database va collections

```bash
cd server
npm run db:init
```

### Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

## Bien moi truong

- `server/.env.example`
- `client/.env.example`

## Build

### Backend

```bash
cd server
npm run build
npm run start
```

### Frontend

```bash
cd client
npm run build
npm run preview
```

## Test

```bash
cd server
npm run test
```

## Ghi chu

- Upload file mac dinh luu o `server/uploads/` khi dev.
- Token truy cap duoc luu o localStorage ben frontend.
