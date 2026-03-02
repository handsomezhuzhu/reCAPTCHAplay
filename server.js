require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_PLAY_ATTEMPTS = parseInt(process.env.MAX_PLAY_ATTEMPTS || '3', 10);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store for rate limiting: { "ip_fingerprint": count }
const playCounts = {};

// New endpoint for frontend to fetch the non-secret site keys dynamically
app.get('/api/config', (req, res) => {
    res.json({
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || 'your_google_site_key_here',
        hcaptchaSiteKey: process.env.HCAPTCHA_SITE_KEY || 'your_hcaptcha_site_key_here'
    });
});

app.post('/api/verify', async (req, res) => {
    const { recaptchaToken, hcaptchaToken, fingerprint } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const identifier = `${ip}_${fingerprint}`;

    // 1. Rate Limiting Check
    if (!playCounts[identifier]) {
        playCounts[identifier] = 0;
    }

    if (playCounts[identifier] >= MAX_PLAY_ATTEMPTS) {
        return res.status(429).json({
            success: false,
            message: `SYSTEM LOCKDOWN: Maximum play limit of ${MAX_PLAY_ATTEMPTS} attempts reached.`
        });
    }

    if (!recaptchaToken && !hcaptchaToken) {
        return res.status(400).json({ success: false, message: "Security tokens are missing." });
    }

    let recaptchaValid = false;
    let hcaptchaValid = false;

    try {
        // --- 2a. Verify Google reCAPTCHA ---
        const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
        if (!RECAPTCHA_SECRET_KEY || RECAPTCHA_SECRET_KEY.includes('your_')) {
            console.warn("WARNING: Google Secret Key not provided. Using mock verification.");
            recaptchaValid = true;
        } else {
            const reRes = await axios.post(
                `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
            );
            if (reRes.data.success) {
                recaptchaValid = true;
            } else {
                console.error("Google reCAPTCHA verification failed. Full response:", reRes.data);
            }
        }

        // --- 2b. Verify hCaptcha ---
        const HCAPTCHA_SECRET_KEY = process.env.HCAPTCHA_SECRET_KEY;
        if (!HCAPTCHA_SECRET_KEY || HCAPTCHA_SECRET_KEY.includes('your_')) {
            console.warn("WARNING: hCaptcha Secret Key not provided. Using mock verification.");
            hcaptchaValid = true;
        } else {
            const hRes = await axios.post(
                `https://api.hcaptcha.com/siteverify`,
                new URLSearchParams({
                    secret: HCAPTCHA_SECRET_KEY,
                    response: hcaptchaToken
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            if (hRes.data.success) hcaptchaValid = true;
        }

        // --- 3. Final Decision ---
        if (recaptchaValid && hcaptchaValid) {
            playCounts[identifier]++;
            return res.json({
                success: true,
                message: "Verification successful! Both firewalls bypassed.",
                attempts: playCounts[identifier]
            });
        } else {
            return res.status(403).json({
                success: false,
                message: "Bot behavior detected by one or both firewalls."
            });
        }

    } catch (error) {
        console.error("Error verifying tokens:", error);
        return res.status(500).json({ success: false, message: "Internal server error during verification." });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Max play attempts set to: ${MAX_PLAY_ATTEMPTS}`);
});
