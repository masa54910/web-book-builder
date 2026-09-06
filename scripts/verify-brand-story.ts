import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

const route = read("src/app/brand-story/page.tsx");
const story = read("src/components/ver2/BrandStoryPage.tsx");
const about = read("src/components/ver2/AboutWebBookMakerPage.tsx");
const crossNavigation = read("src/components/ver2/BrandArticleLinks.tsx");
const reveal = read("src/components/ver2/ArticleReveal.tsx");
const revealStyles = read("src/components/ver2/ArticleReveal.module.css");

assert.match(route, /なぜ、このWebBookMakerを作ったか。｜WebBookMaker/);
assert.match(route, /canonical: "https:\/\/webbookmaker\.vercel\.app\/brand-story"/);
assert.match(route, /type: "article"/);

const sectionIds = ["buried", "presentation", "delivery", "calling-card", "platform", "ai", "maker"];
let lastPosition = -1;
for (const id of sectionIds) {
  const position = story.indexOf(`id="${id}"`);
  assert.ok(position > lastPosition, `section ${id} must exist in the required order`);
  lastPosition = position;
}

assert.match(story, /読まれなかった文章に、/);
assert.match(story, /価値がなかったとは限らない。/);
assert.match(story, /書いたものに、新たな届け方を。/);
assert.match(story, /href="\/signup\?next=%2Fbooks%2Fnew"/);
assert.match(story, /href="\/about"/);
assert.doesNotMatch(story, /WebBookMakerができるまで|AIとの開発記録/);

assert.match(about, /<BrandArticleLinks current="what" \/>/);
assert.match(crossNavigation, /href: "\/brand-story"/);
assert.match(crossNavigation, /href: "\/about"/);
assert.match(reveal, /prefers-reduced-motion: reduce/);
assert.match(reveal, /window\.location\.hash/);
assert.match(reveal, /element\.contains\(hashTarget\)/);
assert.match(revealStyles, /@media \(prefers-reduced-motion: reduce\)/);
assert.doesNotMatch(revealStyles, /opacity:\s*0;/, "article copy must stay readable while reveal is pending");

console.log("Brand Story static verification passed");
