import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateIcon() {
  const inputPath = path.resolve('public/logos/fse-app-icon-master.svg');
  const outputPath = path.resolve('build/icon.png');

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Source icon not found at ${inputPath}`);
    process.exit(1);
  }

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    await sharp(inputPath)
      .resize(1024, 1024)
      .png()
      .toFile(outputPath);
    console.log(`Successfully generated ${outputPath}`);
  } catch (err) {
    console.error('Error generating icon:', err);
    process.exit(1);
  }
}

generateIcon();
