// Simple browser fingerprinting utility for rate limiting
const Utils = {
    async getFingerprint() {
        // Collect basic non-intrusive data
        const nav = window.navigator;
        const screen = window.screen;

        let canvasFingerprint = '';
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = "top";
            ctx.font = "14px 'Arial'";
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = "#f60";
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = "#069";
            ctx.fillText("reCAPTCHA Game", 2, 15);
            ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
            ctx.fillText("reCAPTCHA Game", 4, 17);
            canvasFingerprint = canvas.toDataURL();
        } catch (e) {
            // ignore
        }

        const dataStr = [
            nav.userAgent,
            nav.language,
            screen.colorDepth,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvasFingerprint
        ].join('###');

        // Simple hash function
        let hash = 0;
        for (let i = 0; i < dataStr.length; i++) {
            const char = dataStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }
};
