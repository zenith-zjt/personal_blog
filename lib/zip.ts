import { inflateRawSync } from "node:zlib";

export type ZipEntry = {
  name: string;
  data: Buffer;
};

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const UTF8_FLAG = 0x0800;
const gb18030Decoder = new TextDecoder("gb18030");
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

const crcTable = new Uint32Array(256);

for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(buffer: Buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function normalizeZipPath(entryName: string) {
  const normalized = entryName.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);

  if (
    normalized.includes("\0") ||
    /^[a-zA-Z]:/.test(normalized) ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(`压缩包中包含非法路径：${entryName}`);
  }

  return segments.join("/");
}

function scoreDecodedName(value: string) {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;

    if (character === "\uFFFD" || codePoint < 0x20) {
      score -= 12;
      continue;
    }

    if (
      (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
      (codePoint >= 0x3400 && codePoint <= 0x4dbf)
    ) {
      score += 6;
      continue;
    }

    if (/[a-zA-Z0-9/._\- ]/.test(character)) {
      score += 2;
      continue;
    }

    score += 1;
  }

  if (/[ÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝÞß]/.test(value)) {
    score -= 8;
  }

  return score;
}

function decodeZipEntryName(rawName: Buffer, flags: number) {
  if (flags & UTF8_FLAG) {
    return normalizeZipPath(rawName.toString("utf8"));
  }

  const candidates: string[] = [];

  try {
    candidates.push(utf8Decoder.decode(rawName));
  } catch {
    // Ignore invalid UTF-8 and fall back to legacy encodings.
  }

  candidates.push(gb18030Decoder.decode(rawName));
  candidates.push(rawName.toString("latin1"));

  const decoded = candidates
    .map((value) => ({
      value,
      score: scoreDecodedName(value),
    }))
    .sort((left, right) => right.score - left.score)[0]?.value;

  return normalizeZipPath(decoded ?? rawName.toString("utf8"));
}

export function createZip(entries: ZipEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = normalizeZipPath(entry.name);
    const nameBuffer = Buffer.from(name, "utf8");
    const checksum = crc32(entry.data);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(LOCAL_FILE_HEADER, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(UTF8_FLAG, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(entry.data.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, entry.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(CENTRAL_DIRECTORY_HEADER, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(UTF8_FLAG, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(entry.data.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + entry.data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endHeader = Buffer.alloc(22);
  endHeader.writeUInt32LE(END_OF_CENTRAL_DIRECTORY, 0);
  endHeader.writeUInt16LE(0, 4);
  endHeader.writeUInt16LE(0, 6);
  endHeader.writeUInt16LE(entries.length, 8);
  endHeader.writeUInt16LE(entries.length, 10);
  endHeader.writeUInt32LE(centralDirectory.length, 12);
  endHeader.writeUInt32LE(offset, 16);
  endHeader.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endHeader]);
}

function findEndOfCentralDirectory(buffer: Buffer) {
  const searchStart = Math.max(0, buffer.length - 65557);

  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY) {
      return offset;
    }
  }

  throw new Error("无法识别 ZIP 文件结构。");
}

export function readZip(buffer: Buffer): ZipEntry[] {
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  const entries: ZipEntry[] = [];
  let offset = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_DIRECTORY_HEADER) {
      throw new Error("ZIP 中央目录损坏。");
    }

    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = decodeZipEntryName(
      buffer.subarray(offset + 46, offset + 46 + nameLength),
      flags,
    );

    offset += 46 + nameLength + extraLength + commentLength;

    if (!name || name.endsWith("/")) {
      continue;
    }

    if (buffer.readUInt32LE(localOffset) !== LOCAL_FILE_HEADER) {
      throw new Error(`ZIP 本地文件头损坏：${name}`);
    }

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    let data: Buffer;

    if (method === 0) {
      data = Buffer.from(compressed);
    } else if (method === 8) {
      data = inflateRawSync(compressed);
    } else {
      throw new Error(`不支持的 ZIP 压缩方法：${method}`);
    }

    if (data.length !== uncompressedSize) {
      throw new Error(`ZIP 文件大小校验失败：${name}`);
    }

    entries.push({ name, data });
  }

  return entries;
}
