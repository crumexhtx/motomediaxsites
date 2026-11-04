const html = await (
  await fetch("http://127.0.0.1:3000/rentals/houston/hobby-airport")
).text();
const blocks = [
  ...html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  ),
].map((m) => JSON.parse(m[1]));
const faq = blocks.find((b) => b["@type"] === "FAQPage");
if (!faq) {
  console.error("No FAQPage JSON-LD");
  process.exit(1);
}
let ok = true;
for (const q of faq.mainEntity) {
  if (!html.includes(q.name)) {
    console.log("MISSING Q:", q.name);
    ok = false;
  }
  const chunk = q.acceptedAnswer.text.slice(0, 48);
  if (!html.includes(chunk)) {
    console.log("MISSING A chunk:", chunk);
    ok = false;
  }
}
console.log(
  ok ? "FAQ JSON-LD matches visible text" : "FAQ MISMATCH",
  `(${faq.mainEntity.length} Qs)`,
);
for (const [i, q] of faq.mainEntity.entries()) {
  console.log(`${i + 1}. ${q.name}`);
}
process.exit(ok ? 0 : 1);
