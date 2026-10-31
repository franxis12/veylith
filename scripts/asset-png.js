import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
export const hash = (value) => createHash('sha256').update(value).digest('hex');
/** Lossless PNG inspection. Supports the actual 8-bit, noninterlaced RGB/RGBA exports. */
export function decodePng(buffer) {
  const width = buffer.readUInt32BE(16),
    height = buffer.readUInt32BE(20);
  const depth = buffer[24],
    colorType = buffer[25],
    interlace = buffer[28];
  if (depth !== 8 || ![2, 6].includes(colorType) || interlace !== 0)
    throw new Error(
      `Unsupported PNG encoding ${depth}/${colorType}/${interlace}`,
    );
  const chunks = [];
  for (let offset = 8; offset < buffer.length;) {
    const size = buffer.readUInt32BE(offset),
      type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT')
      chunks.push(buffer.subarray(offset + 8, offset + 8 + size));
    offset += size + 12;
  }
  const channels = colorType === 6 ? 4 : 3,
    stride = width * channels;
  const packed = inflateSync(Buffer.concat(chunks));
  if (packed.length !== (stride + 1) * height)
    throw new Error('Truncated PNG data');
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = packed[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x;
      const a = x >= channels ? pixels[index - channels] : 0;
      const b = y ? pixels[index - stride] : 0;
      const c = y && x >= channels ? pixels[index - stride - channels] : 0;
      const p = a + b - c,
        pa = Math.abs(p - a),
        pb = Math.abs(p - b),
        pc = Math.abs(p - c);
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? a
            : filter === 2
              ? b
              : filter === 3
                ? Math.floor((a + b) / 2)
                : filter === 4
                  ? pa <= pb && pa <= pc
                    ? a
                    : pb <= pc
                      ? b
                      : c
                  : NaN;
      if (!Number.isFinite(predictor)) throw new Error('Invalid PNG filter');
      pixels[index] = packed[y * (stride + 1) + 1 + x] + predictor;
    }
  }
  const rgba = channels === 4 ? pixels : Buffer.alloc(width * height * 4, 255);
  if (channels === 3)
    for (let p = 0; p < width * height; p++)
      pixels.copy(rgba, p * 4, p * 3, p * 3 + 3);
  let left = width,
    top = height,
    right = 0,
    bottom = 0,
    transparent = 0,
    partial = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const alpha = rgba[(y * width + x) * 4 + 3];
      if (alpha === 0) transparent++;
      else {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + 1);
        bottom = Math.max(bottom, y + 1);
      }
      if (alpha > 0 && alpha < 255) partial++;
    }
  return {
    width,
    height,
    rgba,
    mode: colorType === 6 ? 'RGBA' : 'RGB',
    alphaBounds: right ? [left, top, right, bottom] : null,
    transparentPixels: transparent,
    partialAlphaPixels: partial,
    pixelHash: hash(rgba),
  };
}
export function cellHash(image, x, y, width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row++)
    image.rgba.copy(
      pixels,
      row * width * 4,
      ((y + row) * image.width + x) * 4,
      ((y + row) * image.width + x + width) * 4,
    );
  return hash(pixels);
}
