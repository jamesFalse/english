import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const cefrOrder = ["A1", "A2", "B1", "B2", "C1", "C2"];

async function main() {
  const dataPath = path.join(__dirname, "../data/oxford_5000_filtered.json");
  const rawData = fs.readFileSync(dataPath, "utf-8");
  const words: { word: string; cefr: string }[] = JSON.parse(rawData);

  console.log(`Initial data count: ${words.length}`);

  // De-duplicate: Keep the one with the highest CEFR level if multiple exist
  const wordMap = new Map<string, string>();
  for (const item of words) {
    const existingCefr = wordMap.get(item.word);
    if (!existingCefr || cefrOrder.indexOf(item.cefr) > cefrOrder.indexOf(existingCefr)) {
      wordMap.set(item.word, item.cefr);
    }
  }

  const uniqueWords = Array.from(wordMap.entries()).map(([word, cefr]) => ({ word, cefr }));
  console.log(`Unique words count: ${uniqueWords.length}`);

  // Batching to improve performance
  for (let i = 0; i < uniqueWords.length; i += 100) {
    const batch = uniqueWords.slice(i, i + 100);
    // Use upsert sequentially within batch to be safe, or just use Promise.all if we're sure no dupes in THIS batch
    await Promise.all(
      batch.map((item) =>
        prisma.word.upsert({
          where: { text: item.word },
          update: { cefr: item.cefr },
          create: {
            text: item.word,
            cefr: item.cefr,
          },
        })
      )
    );
    if (i % 1000 === 0) {
      console.log(`Seeded ${Math.min(i + 100, uniqueWords.length)}/${uniqueWords.length} words`);
    }
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
