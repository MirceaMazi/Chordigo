import sharp from "sharp";

for (const size of [192, 512]) {
  await sharp("src/app/icon.svg").resize(size, size).png().toFile(`public/icon-${size}.png`);
}
