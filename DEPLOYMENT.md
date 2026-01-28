# Deploying SoulLink

This guide explains how to deploy SoulLink to a live environment using
Vercel for the frontend and Render for the backend.

---

## 1. Backend Deployment (Render)

1. Create a new **Web Service** on [Render](https://render.com/)
2. Connect your GitHub repository

### Settings
- **Root Directory:** `server`
- **Build Command:** `npm install`
- **Start Command:** `node index.js`

### Environment Variables
```env
PORT=10000
CLIENT_URL=https://your-frontend-project.vercel.app
```
*Render will automatically assign a public backend URL after deployment.*

## 2. Frontend Deployment (Vercel)

1. Create a new Project on [Vercel](https://vercel.com/)
2. Connect your GitHub repository

### Settings
- **Root Directory:** `client`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### Environment Variables
```env
VITE_SERVER_URL=https://your-backend-project.onrender.com
VITE_TURN_USERNAME=your_metered_username
VITE_TURN_CREDENTIAL=your_metered_credential
```

## 3. TURN Server Configuration (Metered)

SoulLink uses Metered TURN/STUN servers to ensure WebRTC connectivity across:
- Mobile networks
- NAT-restricted connections
- Firewalled environments

### Steps
1. Sign up at [https://metered.ca](https://metered.ca)
2. Create a TURN server
3. Copy the credentials into Vercel environment variables

## 4. Optional File Persistence (Advanced)

The backend runs on Render, which uses an ephemeral filesystem.
This means uploaded files are temporary by default.

An optional cloud backup mechanism exists:
- If cloud storage credentials are provided, shared files are backed up
- If not provided, files remain temporary and may expire automatically

*A Terabox-based implementation is currently used internally for this purpose.
This logic is integrated inside the backend and is environment-driven.*

## 5. Final Integration

1. Deploy the backend on Render
2. Copy the backend URL and set it as `VITE_SERVER_URL` in Vercel
3. Deploy the frontend on Vercel
4. Copy the frontend URL and set it as `CLIENT_URL` in Render
5. Redeploy both services if required

**Your application is now live.**
