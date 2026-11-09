import JSZip from "jszip";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type ExtractedParagraph = {
  id: string;
  text: string;
  pageIndex?: number;
  sourceOrder: number;
};
export type ExtractedChapter = { id: string; title: string; paragraphs: ExtractedParagraph[] };
export type ExtractionResult = {
  title: string;
  format: "pdf" | "epub";
  chapters: ExtractedChapter[];
  warnings: string[];
  sourceBytes: number;
};
export type ExtractionProgress = (current: number, total: number) => void;

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_EPUB_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_PARAGRAPH_CHARS = 12_000;

function assertFile(file: File, extension: "pdf" | "epub") {
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    throw new Error("Ukuran file harus antara 1 byte dan 15 MB.");
  }
  if (!file.name.toLowerCase().endsWith("." + extension)) {
    throw new Error("Pilih file ." + extension + " yang valid.");
  }
}
function makeId(seed: string, index: number) {
  return seed + "-" + index.toString(36);
}
function paragraphsFromText(text: string, seed: string, pageIndex?: number) {
  const normalized = text.replace(/\r/g, "").replace(/[\t\u00a0]+/g, " ").trim();
  if (!normalized) return [] as ExtractedParagraph[];
  const chunks = normalized.split(/\n{2,}/).flatMap((part) => {
    const clean = part.replace(/\s*\n\s*/g, " ").trim();
    if (!clean) return [];
    if (clean.length <= MAX_PARAGRAPH_CHARS) return [clean];
    const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [clean];
    const result: string[] = [];
    let buffer = "";
    for (const sentence of sentences) {
      if (buffer.length + sentence.length > MAX_PARAGRAPH_CHARS && buffer) {
        result.push(buffer.trim());
        buffer = "";
      }
      buffer += sentence;
    }
    if (buffer.trim()) result.push(buffer.trim());
    return result;
  });
  return chunks.map((value, i) => ({
    id: makeId(seed, i), text: value,
    ...(pageIndex === undefined ? {} : { pageIndex }), sourceOrder: i,
  }));
}
function makeSingleChapter(title: string, paragraphs: ExtractedParagraph[]): ExtractedChapter[] {
  return [{ id: "chapter-1", title: title || "Konten buku", paragraphs }];
}

export async function extractPdf(file: File, onProgress?: ExtractionProgress): Promise<ExtractionResult> {
  assertFile(file, "pdf");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("File bukan PDF yang valid.");
  let document: PDFDocumentProxy | undefined;
  try {
    document = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
    const all: ExtractedParagraph[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines = content.items
        .filter((item) => "str" in item && typeof item.str === "string")
        .map((item) => item.str.trim()).filter(Boolean);
      const pageText = lines.join(" ").replace(/\s{2,}/g, " ");
      const extracted = paragraphsFromText(pageText, "p" + pageNumber, pageNumber - 1);
      for (const paragraph of extracted) { paragraph.sourceOrder = all.length; all.push(paragraph); }
      onProgress?.(pageNumber, document.numPages);
    }
    if (all.length === 0) throw new Error("PDF tidak memiliki text layer. PDF hasil scan belum didukung; lakukan OCR terlebih dahulu.");
    const title = file.name.replace(/\.pdf$/i, "");
    return {
      title, format: "pdf", chapters: makeSingleChapter(title, all),
      warnings: ["PDF diimpor sebagai satu bagian. Daftar isi/bab perlu dirapikan pada editor TOC."],
      sourceBytes: file.size,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/password|encrypted/i.test(message)) throw new Error("PDF dilindungi kata sandi. Buka proteksi file sebelum mengimpor.");
    throw error;
  } finally { await document?.destroy(); }
}

function safeZipPath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  return !normalized.startsWith("/") && !normalized.split("/").includes("..");
}
function textFromXhtml(source: string) {
  const parsed = new DOMParser().parseFromString(source, "text/html");
  parsed.querySelectorAll("script,style,iframe,object,embed,form,svg,math").forEach((node) => node.remove());
  parsed.querySelectorAll("*").forEach((node) => {
    for (const attribute of [...node.attributes]) {
      if (attribute.name.toLowerCase().startsWith("on") ||
          ["src", "srcset", "style"].includes(attribute.name.toLowerCase())) node.removeAttribute(attribute.name);
    }
  });
  const blocks = [...parsed.body.querySelectorAll("h1,h2,h3,h4,p,li,blockquote,pre")];
  const values = blocks.map((node) => node.textContent?.replace(/\s+/g, " ").trim() ?? "").filter(Boolean);
  return values.length ? values : [parsed.body.textContent?.replace(/\s+/g, " ").trim() ?? ""].filter(Boolean);
}

export async function extractEpub(file: File, onProgress?: ExtractionProgress): Promise<ExtractionResult> {
  assertFile(file, "epub");
  const bytes = await file.arrayBuffer();
  const signature = new Uint8Array(bytes.slice(0, 4));
  if (signature[0] !== 0x50 || signature[1] !== 0x4b) throw new Error("File bukan arsip EPUB/ZIP yang valid.");
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true, createFolders: false });
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.some((entry) => !safeZipPath(entry.name))) throw new Error("EPUB berisi jalur file yang tidak aman.");
  const declaredTotal = entries.reduce((sum, entry) => sum + (entry._data?.uncompressedSize ?? 0), 0);
  if (declaredTotal > MAX_EPUB_UNCOMPRESSED_BYTES) throw new Error("EPUB terlalu besar setelah diekstrak (batas 100 MB).");
  const container = zip.file("META-INF/container.xml");
  if (!container) throw new Error("Struktur EPUB tidak valid: container.xml tidak ditemukan.");
  const containerXml = new DOMParser().parseFromString(await container.async("text"), "application/xml");
  if (containerXml.querySelector("parsererror")) throw new Error("Metadata EPUB rusak.");
  const opfPath = containerXml.querySelector("rootfile")?.getAttribute("full-path");
  if (!opfPath || !safeZipPath(opfPath)) throw new Error("Lokasi metadata EPUB tidak valid.");
  const opfEntry = zip.file(opfPath);
  if (!opfEntry) throw new Error("Paket EPUB tidak ditemukan.");
  const opf = new DOMParser().parseFromString(await opfEntry.async("text"), "application/xml");
  if (opf.querySelector("parsererror")) throw new Error("Metadata EPUB tidak dapat dibaca.");
  const metadata = opf.querySelector("metadata");
  const title = metadata?.getElementsByTagNameNS("*", "title")[0]?.textContent?.trim() || file.name.replace(/\.epub$/i, "");
  const manifest = new Map<string, string>();
  opf.querySelectorAll("manifest item").forEach((item) => {
    const id = item.getAttribute("id"); const href = item.getAttribute("href");
    if (id && href && safeZipPath(href)) manifest.set(id, href);
  });
  const baseDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
  const spine = [...opf.querySelectorAll("spine itemref")];
  if (!spine.length) throw new Error("EPUB tidak memiliki spine/urutan bacaan.");
  const chapters: ExtractedChapter[] = [];
  let paragraphCount = 0;
  for (let i = 0; i < spine.length; i += 1) {
    const idref = spine[i].getAttribute("idref");
    const href = idref ? manifest.get(idref) : undefined;
    if (!href) continue;
    const path = (baseDir + href).replace(/\\/g, "/");
    if (!safeZipPath(path)) continue;
    const entry = zip.file(path);
    if (!entry) continue;
    const values = textFromXhtml(await entry.async("text"));
    const paragraphs = values.flatMap((value) => paragraphsFromText(value, "c" + (i + 1)));
    if (paragraphs.length) {
      paragraphs.forEach((p) => { p.sourceOrder = paragraphCount++; });
      const heading = values.find((value) => value.length < 120) || "Bagian " + (chapters.length + 1);
      chapters.push({ id: makeId("chapter", chapters.length + 1), title: heading, paragraphs });
    }
    onProgress?.(i + 1, spine.length);
  }
  if (!chapters.length) throw new Error("Tidak ada teks yang dapat dibaca dari EPUB.");
  return {
    title, format: "epub", chapters,
    warnings: ["Konten EPUB diimpor sebagai teks aman; gambar, tabel kompleks, dan tata letak khusus tidak dipertahankan."],
    sourceBytes: file.size,
  };
}

export async function hashSourceFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
