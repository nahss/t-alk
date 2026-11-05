// Reads the text out of a PDF in the browser with pdf.js. Nothing is uploaded.
import { countWords } from "./text";

export type PdfResult =
  | { ok: true; text: string; pages: number; words: number }
  | { ok: false; reason: "scanned"; pages: number }
  | { ok: false; reason: "locked" | "broken" };

export function isPdf(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/** ".docx" from "notes.docx", or "this kind of" when there's no extension. */
export function fileExtension(file: File) {
  const m = /\.([a-z0-9]{1,8})$/i.exec(file.name);
  return m ? `.${m[1].toLowerCase()}` : null;
}

let worker: Worker | null = null;

export async function readPdf(file: File): Promise<PdfResult> {
  const pdfjs = await import("pdfjs-dist");
  if (!worker) {
    worker = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), { type: "module" });
    pdfjs.GlobalWorkerOptions.workerPort = worker;
  }

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    void task.destroy();
    const name = (err as { name?: string })?.name;
    return { ok: false, reason: name === "PasswordException" ? "locked" : "broken" };
  }

  try {
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();

      // Rebuild the page's lines, remembering where each sits vertically.
      const lines: { text: string; y: number }[] = [];
      let current = "";
      let y: number | null = null;
      for (const item of content.items) {
        if (!("str" in item)) continue;
        if (y === null && item.str.trim()) y = item.transform[5];
        current += item.str;
        if (item.hasEOL) {
          if (current.trim()) lines.push({ text: current.trim(), y: y ?? 0 });
          current = "";
          y = null;
        }
      }
      if (current.trim()) lines.push({ text: current.trim(), y: y ?? 0 });

      // A bigger gap than the usual line spacing means a new paragraph (or a heading).
      const gaps = lines.slice(1).map((l, i) => Math.abs(lines[i].y - l.y)).filter((g) => g > 0);
      const usual = gaps.length ? [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 0;
      let text = "";
      lines.forEach((l, i) => {
        if (i > 0) {
          const gap = Math.abs(lines[i - 1].y - l.y);
          if (usual && gap > usual * 1.4) text += "\n\n";
          else if (/[\p{L}]-$/u.test(text)) text = text.slice(0, -1); // word split by a hyphen
          else text += " ";
        }
        text += l.text;
      });
      pages.push(text);
      page.cleanup();
    }
    const text = pages.join("\n\n").trim();
    const words = countWords(text);
    if (words < 5) return { ok: false, reason: "scanned", pages: doc.numPages };
    return { ok: true, text, pages: doc.numPages, words };
  } catch {
    return { ok: false, reason: "broken" };
  } finally {
    void task.destroy();
  }
}
