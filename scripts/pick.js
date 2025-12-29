import fs from "fs";
import crypto from "crypto";

const FILE = "percentage";
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

let people = JSON.parse(fs.readFileSync(FILE, "utf8"));
people = people.filter(p => p.percentage >= 0);

if (people.length === 0) {
  console.log("No valid candidates.");
  process.exit(0);
}

const rng = makeRNG(DATE);

const weights = people.map(p => BigInt(p.percentage));
const total = weights.reduce((a, b) => a + b, 0n);

let r = rng() % total;

let chosenIndex = 0;
for (let i = 0; i < weights.length; i++) {
  if (r < weights[i]) {
    chosenIndex = i;
    break;
  }
  r -= weights[i];
}

const chosen = people[chosenIndex];

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

async function createIssue() {
  const url = `https://api.github.com/repos/${REPO}/issues`;

  await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `token ${TOKEN}`,
      "Accept": "application/vnd.github+json"
    },
    body: JSON.stringify({
      title: issueTitle,
      body
    })
  });
}

createIssue();
