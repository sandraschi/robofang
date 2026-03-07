import sys
from pathlib import Path
from docling.document_converter import DocumentConverter


def digest_paper(source_url: str, output_dir: Path):
    """
    OpenFang ArXiv Digestor
    Uses Docling to extract LaTeX, tables, and graphs into RAG-ready markdown.
    """
    print(f"[*] Extracting high-entropy data from: {source_url}")

    converter = DocumentConverter()
    result = converter.convert(source_url)

    # Export to Markdown (best for LLM digestion)
    md_content = result.document.export_to_markdown()

    paper_id = source_url.split("/")[-1].replace(".pdf", "")
    output_path = output_dir / f"{paper_id}.md"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"[+] Digestion complete: {output_path}")
    return output_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python digestor.py <arxiv_url_or_pdf>")
        sys.exit(1)

    url = sys.argv[1]
    out = Path("./exchange")
    out.mkdir(exist_ok=True)

    digest_paper(url, out)
