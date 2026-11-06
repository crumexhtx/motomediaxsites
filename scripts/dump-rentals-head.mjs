const base = process.argv[2] || "http://127.0.0.1:3101";
const html = await (await fetch(`${base}/rentals`)).text();
const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";
const interesting = [...head.matchAll(/<(title|meta|link)[^>]*>/gi)]
  .map((m) => m[0])
  .filter((t) =>
    /title|description|canonical|og:|twitter:|viewport|next-size/i.test(t),
  );
console.log("=== HEAD TAGS ===");
console.log(interesting.join("\n"));

const blocks = [
  ...html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  ),
].map((m) => JSON.parse(m[1]));
const faq = blocks.find((b) => b["@type"] === "FAQPage");
const visibleQs = [
  ...html.matchAll(
    /<dt[^>]*class=["'][^"']*font-medium[^"']*["'][^>]*>([^<]+)<\/dt>/gi,
  ),
].map((m) => m[1]);

console.log(`\n=== FAQ JSON-LD Qs (${faq?.mainEntity?.length || 0}) ===`);
for (const q of faq?.mainEntity || []) console.log("-", q.name);
console.log(`\n=== Visible FAQ Qs (${visibleQs.length}) ===`);
visibleQs.forEach((q) => console.log("-", q));

let match = true;
for (const q of faq?.mainEntity || []) {
  const chunk = q.acceptedAnswer.text.slice(0, 40);
  if (!html.includes(q.name) || !html.includes(chunk)) {
    match = false;
    console.log("MISMATCH", q.name);
  }
}
console.log("\nJSON-LD matches visible answers:", match);
console.log(
  "Safety Q in JSON-LD:",
  (faq?.mainEntity || []).some((q) => /safe to rent/i.test(q.name)),
);
console.log(
  "Safety Q visible:",
  html.includes("Is it safe to rent from a private owner?"),
);
console.log(
  "Empty next-size-adjust:",
  /next-size-adjust[^>]*content=["']\s*["']/.test(head),
);
