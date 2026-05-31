import fs from 'fs';
import path from 'path';

const DEEPSEEK_API_KEY = "sk-a2dc0881aaac4bfcbe75b200177655b1";
const DATA_FILE = path.join(process.cwd(), 'data', 'listicle_queue.json');

const categories = [
  "Laptops & Computing",
  "Smartphones & Accessories",
  "Smart Home & IoT",
  "Audio & Headphones",
  "Gaming & VR",
  "Home Appliances",
  "Health & Wearables"
];

async function generateSeedTopicsBatch(batchSize = 20) {
  const category = categories[Math.floor(Math.random() * categories.length)];
  console.log(`🧠 Brainstorming ${batchSize} 'Top 10' topics for category: ${category}...`);

  const prompt = `
You are a Senior Editor at a TopTenReviews-style Consumer Tech site.
Brainstorm exactly ${batchSize} highly specific, high-search-volume "Top 10" review topics for the "${category}" category.
Each topic must be a buyer's guide focusing on the year 2026.

Output a valid JSON OBJECT with a single key "listicles" containing an array of objects.
{
  "listicles": [
    {
      "topic": "String. e.g. 'Top 10 Noise-Canceling Earbuds for Commuters 2026'",
      "category": "${category}",
      "intent": "Buyer's Guide"
    }
  ]
}
  `.trim();

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) throw new Error("API Error");
  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return parsed.listicles || [];
}

async function runGenerator(totalLimit) {
  let existingQueue = [];
  if (!fs.existsSync(path.dirname(DATA_FILE))) fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (fs.existsSync(DATA_FILE)) existingQueue = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

  const newItems = await generateSeedTopicsBatch(totalLimit);
  newItems.forEach(item => item.status = 'pending');
  existingQueue.push(...newItems);
  fs.writeFileSync(DATA_FILE, JSON.stringify(existingQueue, null, 2), 'utf-8');
  console.log(`✅ Added ${newItems.length} listicles to queue. Total: ${existingQueue.length}`);
}

const limit = process.argv.includes('--limit') ? parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : 20;
runGenerator(limit);
