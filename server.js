require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_PLAY_ATTEMPTS = parseInt(process.env.MAX_PLAY_ATTEMPTS || '3', 10);
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store for rate limiting: { "ip_fingerprint": count }
const playCounts = {};

app.post('/api/verify', async (req, res) => {
    const { token, fingerprint } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const identifier = `${ip}_${fingerprint}`;

    // 1. Rate Limiting Check
    if (!playCounts[identifier]) {
        playCounts[identifier] = 0;
    }

    if (playCounts[identifier] >= MAX_PLAY_ATTEMPTS) {
        return res.status(429).json({
            success: false,
            message: `You have reached the maximum play limit of ${MAX_PLAY_ATTEMPTS} attempts. Please try again later.`
        });
    }

    // 2. reCAPTCHA Verification
    if (!RECAPTCHA_SECRET_KEY || RECAPTCHA_SECRET_KEY === 'your_secret_key_here') {
        // Mock verification for local testing if no key is provided
        console.warn("WARNING: reCAPTCHA Secret Key not provided. Using mock verification.");
        playCounts[identifier]++;
        return res.json({ success: true, message: "Mock verification successful!", score: 0.9, attempts: playCounts[identifier] });
    }

    if (!token) {
        return res.status(400).json({ success: false, message: "reCAPTCHA token is missing." });
    }

    try {
        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`
        );

        const data = response.data;

        if (data.success) {
            // Success - update play count
            playCounts[identifier]++;
            return res.json({
                success: true,
                message: "Verification successful! You bypassed the firewall!",
                score: "V2_CHECKBOX_OK",
                attempts: playCounts[identifier]
            });
        } else {
            // Failed bot check
            return res.status(403).json({
                success: false,
                message: "Bot behavior detected by reCAPTCHA firewall.",
                errors: data['error-codes']
            });
        }
    } catch (error) {
        console.error("Error verifying reCAPTCHA:", error);
        return res.status(500).json({ success: false, message: "Internal server error during verification." });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Max play attempts set to: ${MAX_PLAY_ATTEMPTS}`);
});
