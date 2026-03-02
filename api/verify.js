const axios = require('axios');

// In-memory store for rate limiting
let playCounts = {};

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    const MAX_PLAY_ATTEMPTS = parseInt(process.env.MAX_PLAY_ATTEMPTS || '3', 10);
    const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

    const { token, fingerprint } = req.body;
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown_ip';
    const identifier = `${ip}_${fingerprint}`;

    if (!playCounts[identifier]) {
        playCounts[identifier] = 0;
    }

    if (playCounts[identifier] >= MAX_PLAY_ATTEMPTS) {
        return res.status(429).json({
            success: false,
            message: `You have reached the maximum play limit of ${MAX_PLAY_ATTEMPTS} attempts. Please try again later.`
        });
    }

    if (!RECAPTCHA_SECRET_KEY || RECAPTCHA_SECRET_KEY === 'your_secret_key_here') {
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

        if (data.success && data.score >= 0.5) {
            playCounts[identifier]++;
            return res.json({
                success: true,
                message: "Verification successful! You defeated the Boss!",
                score: data.score,
                attempts: playCounts[identifier]
            });
        } else {
            return res.status(403).json({
                success: false,
                message: "Bot behavior detected by reCAPTCHA.",
                errors: data['error-codes']
            });
        }
    } catch (error) {
        console.error("Error verifying reCAPTCHA:", error);
        return res.status(500).json({ success: false, message: "Internal server error during verification." });
    }
};
