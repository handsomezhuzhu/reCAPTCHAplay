const axios = require('axios');

async function test() {
    for (let i = 1; i <= 4; i++) {
        try {
            console.log(`Attempt ${i}...`);
            const res = await axios.post('http://localhost:3000/api/verify', { token: "mock_token", fingerprint: "fp_123" });
            console.log(`Response ${i}: ${res.data.message} (Score: ${res.data.score}, Used Attempts: ${res.data.attempts})`);
        } catch (err) {
            console.error(`Attempt ${i} Failed: ${err.response.status} - ${err.response.data.message}`);
        }
    }
}
test();
