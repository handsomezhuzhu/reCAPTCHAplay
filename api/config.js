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

    res.json({
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || 'your_google_site_key_here',
        hcaptchaSiteKey: process.env.HCAPTCHA_SITE_KEY || 'your_hcaptcha_site_key_here'
    });
};
