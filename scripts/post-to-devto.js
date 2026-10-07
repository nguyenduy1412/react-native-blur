#!/usr/bin/env node

/**
 * Script to publish or update marketing/DEVTO_ARTICLE.md on Dev.to via Dev.to API.
 * 
 * Usage:
 *   DEVTO_API_KEY="your_api_key" node scripts/post-to-devto.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const apiKey = process.env.DEVTO_API_KEY;

if (!apiKey) {
  console.error('\x1b[31mError: Dev.to API key missing! Set the DEVTO_API_KEY environment variable.\x1b[0m');
  process.exit(1);
}

const articlePath = path.join(__dirname, '..', 'marketing', 'DEVTO_ARTICLE.md');
if (!fs.existsSync(articlePath)) {
  console.error(`\x1b[31mArticle file not found at ${articlePath}\x1b[0m`);
  process.exit(1);
}

const fileContent = fs.readFileSync(articlePath, 'utf8');

// Parse frontmatter
const match = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!match) {
  console.error('\x1b[31mFailed to parse frontmatter in article markdown.\x1b[0m');
  process.exit(1);
}

const frontmatter = match[1];
const bodyMarkdown = match[2].trim();

const meta = {};
frontmatter.split('\n').forEach(line => {
  const [key, ...rest] = line.split(':');
  if (key && rest.length) {
    meta[key.trim()] = rest.join(':').trim();
  }
});

const payload = JSON.stringify({
  article: {
    title: meta.title || 'React Native Blur: Real Frosted Glass & Video Blur on Android',
    published: meta.published === 'true',
    body_markdown: bodyMarkdown,
    tags: (meta.tags || 'reactnative, android, ios, webdev').split(',').map(t => t.trim()),
    description: meta.description || 'Native video blur for React Native',
    canonical_url: meta.canonical_url || 'https://github.com/nguyenduy1412/react-native-blur'
  }
});

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  console.log('\x1b[36mChecking existing articles on Dev.to...\x1b[0m');
  
  // Find existing article
  const listRes = await request({
    hostname: 'dev.to',
    port: 443,
    path: '/api/articles/me/all',
    method: 'GET',
    headers: {
      'api-key': apiKey,
      'User-Agent': 'RN-Blur-Publisher/1.0'
    }
  });

  let articleId = null;
  if (Array.isArray(listRes.body) && listRes.body.length > 0) {
    const existing = listRes.body.find(a => 
      a.title.includes('Blur') || a.canonical_url.includes('react-native-blur')
    );
    if (existing) {
      articleId = existing.id;
    }
  }

  const method = articleId ? 'PUT' : 'POST';
  const apiPath = articleId ? `/api/articles/${articleId}` : '/api/articles';

  console.log(`\x1b[36m${articleId ? `Updating article #${articleId}` : 'Publishing new article'} on Dev.to...\x1b[0m`);

  const saveRes = await request({
    hostname: 'dev.to',
    port: 443,
    path: apiPath,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'User-Agent': 'RN-Blur-Publisher/1.0',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, payload);

  if (saveRes.status >= 200 && saveRes.status < 300) {
    console.log(`\x1b[32m✔ Successfully ${articleId ? 'updated' : 'published'} on Dev.to!\x1b[0m`);
    console.log(`URL: \x1b[34m${saveRes.body.url}\x1b[0m`);
  } else {
    console.error(`\x1b[31m✖ Failed (HTTP ${saveRes.status}):\x1b[0m`, saveRes.body || saveRes.raw);
  }
}

run().catch(err => console.error(err));
