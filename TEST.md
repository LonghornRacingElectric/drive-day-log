# Testing Guide

This guide explains how to test the Drive Day Log application during development, both locally on your computer and on a mobile device.

## Testing Normally on Your Computer

1. **Start the Development Server**
   Run the following command in your terminal from the project root:
   ```bash
   npm run dev
   ```

2. **Open the Application**
   Open your browser and navigate to the local URL provided by Vite (typically `http://localhost:5173`).

3. **Simulate Multi-User Flow**
   - Open a standard window to act as the **Admin (Host)**. Create a new session and copy the Session Code.
   - Open an Incognito/Private window (or a different browser) to act as a **Marshal**. Enter the Session Code to join.
   - You can now test real-time synchronization (like penalities, track conditions, etc.) between the host and marshal windows side-by-side.

---

## Testing on a Phone Locally (Using ngrok)

If you want to test the mobile layout and functionality directly on a physical phone without deploying to production, you can use `ngrok` to securely expose your local development server to the internet.

### Prerequisites
- Install `ngrok` on your computer (e.g., via Homebrew: `brew install ngrok/ngrok/ngrok`).
- If you haven't already, sign up for a free account at [ngrok.com](https://dashboard.ngrok.com/signup).
- Authenticate your local ngrok agent by running:
  ```bash
  ngrok config add-authtoken <your-authtoken-from-dashboard>
  ```

### Steps to Test

1. **Start the Development Server with Host Flag**
   You must tell Vite to listen on all local IP addresses so ngrok can communicate with it. Run:
   ```bash
   npm run dev -- --host
   ```

2. **Start ngrok**
   Open a *new terminal window* and run ngrok to tunnel traffic to Vite's default port (`5173`). Since you are using a static edge domain configured in `vite.config.ts`, run:
   ```bash
   ngrok http --domain=slogan-unleaded-supper.ngrok-free.dev 5173
   ```
   *(Note: If you don't use the `--domain` flag, ngrok will generate a random URL like `https://1a2b3c.ngrok.app`. In that case, you must temporarily add that exact URL to the `allowedHosts` array in `vite.config.ts` and restart Vite.)*

3. **Access on Your Phone**
   - Make sure both `npm run dev` and `ngrok` are actively running in your terminals.
   - Open the web browser on your phone.
   - Navigate to the **Forwarding** HTTPS URL provided by the ngrok terminal output (e.g., `https://slogan-unleaded-supper.ngrok-free.dev`).
   - You should now be able to interact with your local development environment directly from your mobile device and test the touch interface!
