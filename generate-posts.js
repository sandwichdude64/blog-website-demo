const fs = require('fs');
const path = require('path');
const pdfExtract = require('pdf-extraction');

const postsDir = path.join(__dirname, 'posts');
const outputFile = path.join(__dirname, 'posts.json');

// Extract text using pdf-extraction (works on Node 22)
async function extractPdfText(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfExtract(dataBuffer);

    const lines = data.text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const title = lines[0] || "Untitled PDF";
    const desc = lines.slice(1, 3).join(" ") || "";

    return { title, desc };

  } catch (err) {
    console.error("PDF read error:", err);
    return { title: "Untitled PDF", desc: "" };
  }
}

async function scanPosts() {
  try {
    const items = fs.readdirSync(postsDir);
    const posts = [];

    for (const item of items) {
      const itemPath = path.join(postsDir, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        const files = fs.readdirSync(itemPath);

        const pdfFile = files.find(f => f.toLowerCase().endsWith('.pdf'));
        const hasCard = files.includes('card.jpg');

        if (pdfFile && hasCard) {
          const pdfPath = path.join(itemPath, pdfFile);

          const { title, desc } = await extractPdfText(pdfPath);

          posts.push({
            folder: item,
            pdf: pdfFile,
            title,
            desc
          });
        }
      }
    }

    posts.sort((a, b) => b.folder.localeCompare(a.folder));

    fs.writeFileSync(outputFile, JSON.stringify(posts, null, 2));
    console.log(`Updated posts.json with ${posts.length} posts!`);
  } catch (error) {
    console.error("Error scanning posts directory:", error);
  }
}

if (process.argv.includes('--watch')) {
  console.log("Watching 'posts' directory for changes...");
  scanPosts();
  fs.watch(postsDir, { recursive: true }, () => scanPosts());
} else {
  scanPosts();
}
