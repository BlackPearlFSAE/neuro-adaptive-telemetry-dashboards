# 🚀 Deployment Guide: BP16 Dashboard

You asked how to deploy the system to `github.io`. Here is the complete guide.

> **⚠️ CRITICAL: Backend Limitation**
> **GitHub Pages only hosts static websites (Frontend).**
> It **CANNOT** run your Python Backend (`main.py`).
>
> **What this means:**
> 1. Your Dashboard UI will appear on the internet (e.g., `https://yourname.github.io/repo`).
> 2. **BUT** it will show "DISCONNECTED" unless:
>    - You keep your backend running on your computer locally, OR
>    - You deploy the backend to a cloud server (like Render, Railway, or DigitalOcean).

---

## Part 1: Deploying Frontend to GitHub Pages

I have already configured your `package.json` and `vite.config.ts`. Now follow these steps in your terminal:

### 1. Install the deployer tool
Run this command in the `frontend` folder:
```bash
cd "/Users/nrkwine/Downloads/f1/formulaSystem/neuro-adaptive telemetry system/frontend"
npm install gh-pages --save-dev
```

### 2. Update package.json (Optional but Recommended)
Open `package.json` and add your homepage URL at the top (replace variables with your actual GitHub info):
```json
"homepage": "https://<your-github-username>.github.io/<your-repo-name>",
```


### 3. Deploy!
**Option A: Manual Deployment (Fastest for now)**
Run this command periodically when you want to update the site:
```bash
npm run deploy
```

**Option B: Automated Deployment (GitHub Actions)**
You asked about `deploy.yml` - Yes! This is the modern way.
I have created `.github/workflows/deploy.yml` for you.
1. Simply push your code to GitHub:
   ```bash
   git add .
   git commit -m "Setup deployment"
   git push origin main
   ```
2. GitHub Actions will automatically build and deploy your site to the `gh-pages` branch.

---

## Part 2: What about the Backend?

Since GitHub Pages cannot run Python, you have two options:

### Option A: Local Backend (Easiest for testing)
1. Keep the frontend open on GitHub Pages.
2. Run the backend on your computer:
   ```bash
   cd "../backend"
   python3 main.py
   ```
3. **Note**: Browsers might block the connection because GitHub Pages is `HTTPS` (Secure) and your local backend is `HTTP` (Unsecure). You may need to allow "Insecure Content" in your browser settings for the site.

### Option B: Cloud Backend (Professional)
To make it work strictly online for everyone, deploy the backend to a free/cheap tier on **Render.com** or **Railway.app**.
1. Upload your backend code to GitHub.
2. Connect the repo to Render/Railway.
3. Update `vite.config.ts` in the frontend to point to the new Cloud URL instead of `localhost:8001`.
