import fs from "fs";

const FILE = "percentage.json";
const DATE = new Date().toISOString().slice(0, 10);
const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GITHUB_TOKEN;

const people = JSON.parse(fs.readFileSync(FILE, "utf8"));

const candidates = people.filter(p => p.percentage >= 0);

const weights = candidates.map(p => BigInt(p.percentage));
const seed2 = weights.reduce((a, b) => a ^ b, 0n);

if (candidates.length === 0) {
    console.log("No valid candidates today.");
    process.exit(0);
}

function seededRandom(seed) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return function () {
        h = Math.imul(h + 0x6D2B79F5, 1);
        h ^= h >>> 15;
        h = Math.imul(h, 1 | h);
        h ^= h + Math.imul(h ^ (h >>> 7), 61 | h);
        return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
    };
}

const rand = seededRandom(DATE + seed2);

const total = candidates.reduce((sum, p) => sum + p.percentage, 0);
let r = rand() * total;

let chosen = null;
for (const p of candidates) {
    r -= p.percentage;
    if (r <= 0) {
        chosen = p;
        break;
    }
}

if (!chosen) {
    chosen = candidates[candidates.length - 1];
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
**Date**: ${DATE}

**The Lucky Dog**: **${chosen.name}**

**Updated Percentage**
\`\`\`json
${JSON.stringify(people, null, 2)}
\`\`\`

**Seed1**: \`${DATE}\`

**Seed2**: \'${seed2}\'

**Final Seed**: \'${DATE + seed2}\'
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
