import fs from "fs";

const FILE = "percentage.json";
const DATE = new Date().toISOString().slice(0, 10);
const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GITHUB_TOKEN;

function makeRNG(seedStr) {
  let seed = 0n;
  for (const c of seedStr) {
    seed = (seed * 131n + BigInt(c.charCodeAt(0))) & ((1n << 61n) - 1n);
  }

  return () => {
    seed = (seed * 6364136223846793005n + 1n) & ((1n << 61n) - 1n);
    return seed;
  };
}

const people = JSON.parse(fs.readFileSync(FILE, "utf8"));

const candidates = people.filter(p => p.percentage >= 0);

if (candidates.length === 0) {
  console.log("No valid candidates today.");
  process.exit(0);
}

const rng = makeRNG(DATE);

const weights = candidates.map(p => BigInt(p.percentage));
const total = weights.reduce((a, b) => a + b, 0n);

let r = rng() % total;

let chosen = candidates[0];
for (let i = 0; i < candidates.length; i++) {
  if (r < weights[i]) {
    chosen = candidates[i];
    break;
  }
  r -= weights[i];
}

for (const p of people) {
  if (p.name === chosen.name) {
    p.percentage -= 30;
  } else {
    p.percentage += 10;
  }
}

fs.writeFileSync(FILE, JSON.stringify(people, null, 2));

const issueTitle = "Daily Percentage Result";

const body = `
**Date**：${DATE}

**The Lucky Dog**：**${chosen.name}**

**Updated Percentage**
\`\`\`json
${JSON.stringify(people, null, 2)}
\`\`\`

**Seed**：\`${DATE}\`
`;

await fetch(`https://api.github.com/repos/${REPO}/issues`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${TOKEN}`,
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    title: issueTitle,
    body
  })
});
