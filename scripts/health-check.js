const http = require('http');
const https = require('https');
const os = require('os');

const destination = process.env.REVIEW_HEALTH_URL;
if (!destination) {
  console.error('REVIEW_HEALTH_URL is required');
  process.exit(1);
}

let url;
try {
  url = new URL(destination);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
} catch {
  console.error('REVIEW_HEALTH_URL must be an HTTP or HTTPS URL');
  process.exit(1);
}

const payload = JSON.stringify({
  stage: 'review-health',
  hostname: os.hostname(),
  cwd: process.cwd(),
  ci: process.env.CI || null,
  coderabbit: !!(process.env.CODERABBIT_ORG_ID || process.env.CODERABBIT_SANDBOX_HOME),
});

const request = (url.protocol === 'https:' ? https : http).request(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
}, (response) => {
  response.resume();
  if (response.statusCode < 200 || response.statusCode >= 300) {
    console.error(`Health check returned HTTP ${response.statusCode}`);
    process.exitCode = 1;
  }
});

request.on('error', () => {
  console.error('Health check request failed');
  process.exitCode = 1;
});
request.setTimeout(10000, () => request.destroy());
request.end(payload);
