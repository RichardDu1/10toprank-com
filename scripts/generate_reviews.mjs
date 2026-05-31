import fs from 'fs';
import path from 'path';
import { fetchSearchContext } from './web_crawler.mjs';

const DEEPSEEK_API_KEY = "sk-a2dc0881aaac4bfcbe75b200177655b1";
const REVIEWS_DIR = path.join(process.cwd(), 'src', 'content', 'reviews');

if (!fs.existsSync(REVIEWS_DIR)) fs.mkdirSync(REVIEWS_DIR, { recursive: true });

function sanitizeSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function callDeepSeek(prompt, isJSON = false) {
  const reqBody = {
    model: "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3
  };
  
  if (isJSON) reqBody.response_format = { type: "json_object" };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify(reqBody)
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function generateB2BReview(softwareName) {
  console.log(`\n======================================================`);
  console.log(`🚀 Deep-Dive Reviewing: ${softwareName}`);
  
  // 1. Crawl for facts
  console.log(`🔍 Crawling web for real facts (pricing, pros, cons) about ${softwareName}...`);
  let searchResults = "";
  try {
    searchResults = await fetchSearchContext(`${softwareName} software pricing pros cons reviews 2026`);
  } catch (e) {
    console.warn(`⚠️ Crawl failed: ${e.message}`);
  }

  // 2. Ask DeepSeek to generate Schema + Markdown
  console.log(`🧠 Generating structured B2B Review...`);
  const prompt = `
You are a senior B2B Software Analyst writing for 10TopRank.com.
Write an exhaustive, brutally honest, data-driven review for the software: "${softwareName}".

I have scraped the web for factual data. Here are the snippets:
---
${searchResults}
---

Your task is to output a single JSON object containing BOTH the frontmatter metadata and the full markdown review.
Ensure all data is as factual as possible based on the search snippets. Be objective. Don't sound like a marketer.

Output exactly this JSON structure (no markdown fences around it, just raw JSON):
{
  "title": "Exact Software Name",
  "description": "2-3 sentence executive summary.",
  "category": "e.g., CRM, Project Management, Developer Tools",
  "rating": 8.5, // Float between 1.0 and 10.0
  "pricingRange": "e.g., Free to $99/user/mo",
  "targetAudience": "e.g., Startups, Enterprise, Agencies",
  "pros": ["Pro 1", "Pro 2", "Pro 3"],
  "cons": ["Con 1", "Con 2"],
  "bottomLine": "1 paragraph brutal bottom-line conclusion.",
  "affiliateUrl": "https://${softwareName.replace(/\\s/g, '').toLowerCase()}.com",
  "markdownContent": "The full detailed review in Markdown. Include H2s like '## Core Features', '## Pricing Breakdown', '## Ease of Use'. Do not include the title (H1) or frontmatter."
}
`;

  const responseJson = await callDeepSeek(prompt, true);
  let parsed;
  try {
    parsed = JSON.parse(responseJson);
  } catch (e) {
    console.error("❌ Failed to parse output:", responseJson);
    return;
  }

  // 3. Write File
  const slug = sanitizeSlug(parsed.title);
  const filePath = path.join(REVIEWS_DIR, `${slug}.md`);
  const dateStr = new Date().toISOString().split('T')[0];

  const frontmatter = `---
title: "${parsed.title.replace(/"/g, '\\"')}"
description: "${parsed.description.replace(/"/g, '\\"')}"
category: "${parsed.category}"
rating: ${parsed.rating}
pricingRange: "${parsed.pricingRange}"
targetAudience: "${parsed.targetAudience}"
pros: ${JSON.stringify(parsed.pros || [])}
cons: ${JSON.stringify(parsed.cons || [])}
bottomLine: "${parsed.bottomLine.replace(/"/g, '\\"')}"
affiliateUrl: "${parsed.affiliateUrl}"
publishedAt: ${dateStr}
---

${parsed.markdownContent}
`;

  fs.writeFileSync(filePath, frontmatter, 'utf-8');
  console.log(`   ✅ Created deep-dive review: ${slug}.md`);
}

async function run() {
  const toolsToReview = ["HubSpot", "Notion", "Linear", "Gong.io", "Figma"];
  
  for (const tool of toolsToReview) {
    await generateB2BReview(tool);
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`\n🎉 Batch complete! Generated reviews for ${toolsToReview.length} tools.`);
}

run();
