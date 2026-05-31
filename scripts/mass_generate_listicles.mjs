import fs from 'fs';
import path from 'path';

const DEEPSEEK_API_KEY = "sk-a2dc0881aaac4bfcbe75b200177655b1";
const DATA_FILE = path.join(process.cwd(), 'data', 'listicle_queue.json');
const LISTICLES_DIR = path.join(process.cwd(), 'src', 'content', 'listicles');

if (!fs.existsSync(LISTICLES_DIR)) fs.mkdirSync(LISTICLES_DIR, { recursive: true });

function sanitizeSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function callDeepSeek(prompt) {
  const reqBody = {
    model: "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    response_format: { type: "json_object" }
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify(reqBody)
  });

  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function generateListicle(item) {
  console.log(`\n======================================================`);
  console.log(`🚀 Processing Listicle: ${item.topic}`);
  
  const prompt = `
You are a Senior Editor at a TopTenReviews-style Consumer Tech site.
Create an exhaustive Top 10 product ranking listicle for the topic: "${item.topic}".
Category: ${item.category}

Output EXACTLY this JSON structure. Do not use markdown code fences around the JSON.
{
  "title": "${item.topic}",
  "description": "A compelling 1-2 sentence meta description.",
  "category": "${item.category}",
  "quickList": [
    { "id": "prod-1", "name": "Product 1 Name", "badge": "Best Overall", "score": 9.8 }
  ],
  "products": [
    {
      "id": "prod-1",
      "name": "Product 1 Name",
      "score": 9.8,
      "badge": "Best Overall",
      "pros": ["Pro 1", "Pro 2", "Pro 3"],
      "cons": ["Con 1", "Con 2"],
      "price": "$199.99",
      "affiliateLink": "https://amazon.com/...",
      "description": "A detailed 2-3 paragraph review of the product, why it ranks here, and who it's for."
    }
  ],
  "markdownContent": "A short introductory markdown text for the article, explaining how we tested and what to look for."
}

Ensure there are EXACTLY 10 products.
`;

  const responseJson = await callDeepSeek(prompt);
  let parsed;
  try {
    parsed = JSON.parse(responseJson);
  } catch (e) {
    console.error("❌ Failed to parse JSON.", responseJson.substring(0, 100));
    return false;
  }

  const slug = sanitizeSlug(parsed.title);
  const mdxPath = path.join(LISTICLES_DIR, `${slug}.mdx`);
  
  const frontmatter = `---
title: "${parsed.title.replace(/"/g, '\\"')}"
description: "${parsed.description.replace(/"/g, '\\"')}"
category: "${parsed.category}"
lastUpdated: "${new Date().toISOString().split('T')[0]}"
quickList: ${JSON.stringify(parsed.quickList)}
products: ${JSON.stringify(parsed.products)}
---

${parsed.markdownContent}
`;

  fs.writeFileSync(mdxPath, frontmatter, 'utf-8');
  console.log(`   📄 Created listicle: ${slug}.mdx`);
  return true;
}

async function runMassGeneration(limit = 5) {
  if (!fs.existsSync(DATA_FILE)) {
    console.error("❌ No queue found. Run generate_seed_listicles.mjs first.");
    process.exit(1);
  }

  let queue = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  let pendingItems = queue.filter(item => item.status === 'pending');

  if (pendingItems.length === 0) return console.log("✅ Queue completed!");

  const itemsToProcess = pendingItems.slice(0, limit);
  let successCount = 0;
  for (const item of itemsToProcess) {
    try {
      if (await generateListicle(item)) {
        item.status = 'completed';
        successCount++;
        fs.writeFileSync(DATA_FILE, JSON.stringify(queue, null, 2), 'utf-8');
      }
    } catch (e) {
      item.status = 'failed';
      item.error = e.message;
      fs.writeFileSync(DATA_FILE, JSON.stringify(queue, null, 2), 'utf-8');
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`\n🎉 Generated ${successCount} listicles.`);
}

const limit = process.argv.includes('--batch') ? parseInt(process.argv[process.argv.indexOf('--batch') + 1]) : 5;
runMassGeneration(limit);
