/**
 * Turns an uploaded file into plain text, entirely in the browser. The file is
 * never sent anywhere. Heavy parsers are imported on demand so they cost
 * nothing until somebody actually uploads.
 */
export async function fileToText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return pdfToText(file);
  if (name.endsWith(".docx")) return docxToText(file);
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) return file.text();
  throw new Error("Upload a PDF, DOCX or TXT file, or paste your resume text.");
}

async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    let out = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      out += item.str;
      out += item.hasEOL ? "\n" : " ";
    }
    pages.push(out);
  }
  return pages.join("\n").replace(/[ \t]+\n/g, "\n").replace(/[ ]{2,}/g, " ");
}

async function docxToText(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("That DOCX has no readable text.");
  const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  return xml
    .split(/<\/w:p>/)
    .map((para) => decode(para.replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n").replace(/<(?!w:t[ >])[^>]+>/g, "").replace(/<w:t[^>]*>/g, "").replace(/<\/w:t>/g, "")))
    .map((l) => l.replace(/\s+$/g, ""))
    .filter((l, i, a) => l.trim() || (a[i - 1] ?? "").trim())
    .join("\n");
}
