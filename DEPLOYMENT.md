# Deploying SoulLink

This guide allows you to deploy SoulLink to a live environment using Vercel (Frontend) and Render (Backend).

## 1. Backend Deployment (Render)

1.  Create a new **Web Service** on [Render](https://render.com/).
2.  Connect your GitHub repository.
3.  Use the following settings:
    *   **Root Directory:** `server`
    *   **Build Command:** `npm install`
    *   **Start Command:** `node index.js`
4.  **Environment Variables**:
    *   `PORT`: `10000` (or whatever Render assigns)
    *   `CLIENT_URL`: `https://your-frontend-project.vercel.app` (Add this AFTER deploying frontend)
    *   `TERABOX_NDUS`, `TERABOX_APP_ID`, etc. (Add your Terabox credentials)

## 2. Frontend Deployment (Vercel)

1.  Create a new Project on [Vercel](https://vercel.com/).
2.  Connect your GitHub repository.
3.  Use the following settings:
    *   **Root Directory:** `client`
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `dist`
4.  **Environment Variables**:
    *   `VITE_SERVER_URL`: `https://your-backend-project.onrender.com` (Get this URL from Render)
    *   `VITE_TURN_USERNAME`: `...` (Get from [Metered.ca](https://www.metered.ca))
    *   `VITE_TURN_CREDENTIAL`: `...` (Get from [Metered.ca](https://www.metered.ca))

## 3. Final Integration

1.  Once Backend is live, copy its URL (e.g., `https://soullink-api.onrender.com`).
2.  Go to Vercel -> Project Settings -> Environment Variables.
3.  Add/Update `VITE_SERVER_URL` with the backend URL.
4.  **Redeploy** the Frontend.
5.  Copy the Frontend URL (e.g., `https://soullink.vercel.app`).
6.  Go to Render -> Environment Variables.
7.  Update `CLIENT_URL` with the frontend URL.

Done! Your app is now live.
