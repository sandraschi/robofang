"""
ArXiv RAG Bridge — ingests PDF papers and pushes structured notes to Advanced Memory (ADN).

PDF extraction strategy (in order of availability):
  1. PyMuPDF (fitz) — fast, handles most arXiv PDFs well, extracts text per-page
  2. pdfminer.six — slower but more robust for complex layouts
  3. Plain-text fallback — reads .txt if a pre-extracted version exists alongside the PDF

ADN push: calls `mcp_memops_write_note` via subprocess if running outside an MCP context,
           or imports directly if the memops package is on the path.

Usage:
    python arxiv_rag_bridge.py path/to/paper.pdf
    python arxiv_rag_bridge.py path/to/paper.pdf --dry-run
    python arxiv_rag_bridge.py path/to/paper.pdf --tags "friston,active-inference,robotics"
    python arxiv_rag_bridge.py path/to/paper.pdf --folder "research/arxiv/embodiment"
"""

import argparse
import json
import logging
import re
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger("RoboFang.arxiv_rag")


# ---------------------------------------------------------------------------
# PDF Extraction
# ---------------------------------------------------------------------------


def _extract_with_pymupdf(path: Path) -> Optional[str]:
    """Extract plain text from a PDF using PyMuPDF (fitz). Best-effort."""
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(str(path))
        pages = []
        for page_num, page in enumerate(doc):
            text = page.get_text("text")
            if text.strip():
                pages.append(f"[Page {page_num + 1}]\n{text.strip()}")
        doc.close()
        if pages:
            logger.info(f"PyMuPDF: extracted {len(pages)} pages from {path.name}")
            return "\n\n".join(pages)
    except ImportError:
        logger.debug("PyMuPDF (fitz) not installed — trying pdfminer.")
    except Exception as e:
        logger.warning(f"PyMuPDF failed on {path.name}: {e}")
    return None


def _extract_with_pdfminer(path: Path) -> Optional[str]:
    """Extract plain text using pdfminer.six. Slower but more robust."""
    try:
        from pdfminer.high_level import extract_text

        text = extract_text(str(path))
        if text and text.strip():
            logger.info(f"pdfminer: extracted {len(text)} chars from {path.name}")
            return text.strip()
    except ImportError:
        logger.debug("pdfminer.six not installed.")
    except Exception as e:
        logger.warning(f"pdfminer failed on {path.name}: {e}")
    return None


def _extract_plain_text_sidecar(path: Path) -> Optional[str]:
    """Fall back to a .txt sidecar file if it exists next to the PDF."""
    txt_path = path.with_suffix(".txt")
    if txt_path.exists():
        logger.info(f"Using plain-text sidecar: {txt_path.name}")
        return txt_path.read_text(encoding="utf-8", errors="replace")
    return None


def extract_text_from_pdf(path: Path) -> str:
    """Extract text from a PDF, trying extraction backends in priority order."""
    for extractor in [
        _extract_with_pymupdf,
        _extract_with_pdfminer,
        _extract_plain_text_sidecar,
    ]:
        result = extractor(path)
        if result:
            return result
    # Hard fallback — at least give the title
    logger.error(
        f"No PDF extraction backend available for {path.name}. "
        "Install PyMuPDF: `uv pip install pymupdf`"
    )
    return (
        f"## Extraction Failed\n\n"
        f"Could not extract text from `{path.name}`. "
        "Install PyMuPDF or pdfminer.six and retry."
    )


# ---------------------------------------------------------------------------
# Metadata Heuristics
# ---------------------------------------------------------------------------

_ARXIV_ID_RE = re.compile(r"(\d{4}\.\d{4,5})(v\d+)?")


def _guess_arxiv_id(path: Path) -> Optional[str]:
    """Try to extract arXiv ID from filename."""
    m = _ARXIV_ID_RE.search(path.stem)
    return m.group(1) if m else None


def _truncate(text: str, max_chars: int = 800) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(" ", 1)[0] + " …"


# ---------------------------------------------------------------------------
# Paper Parsing
# ---------------------------------------------------------------------------


def parse_arxiv_paper(file_path: str, extra_tags: Optional[List[str]] = None) -> Dict:
    """
    Extract semantic content from an arXiv PDF and structure it for ADN ingestion.
    Returns a dict with title, content (markdown), tags, and metadata.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Paper not found: {file_path}")

    logger.info(f"Ingesting: {path.name}")

    raw_text = extract_text_from_pdf(path)
    arxiv_id = _guess_arxiv_id(path)

    # Heuristic: first non-empty line ≈ title
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    guessed_title = lines[0] if lines else path.stem

    # Abstract: look for "Abstract" or "ABSTRACT" section
    abstract = ""
    for i, line in enumerate(lines):
        if line.lower().strip() in ("abstract", "abstract."):
            abstract_lines = []
            for j in range(i + 1, min(i + 20, len(lines))):
                if lines[j].lower().startswith(("1 ", "1.", "introduction", "keywords")):
                    break
                abstract_lines.append(lines[j])
            abstract = " ".join(abstract_lines)
            break

    # Build semantic ADN content
    word_count = len(raw_text.split())
    content = (
        "## Core Primitives\n\n"
        "- [observation] ArXiv paper ingested: `"
        + path.name
        + "` ("
        + str(word_count)
        + " words extracted)\n"
        + ("-  [observation] arXiv ID: `" + arxiv_id + "`\n" if arxiv_id else "")
        + ("\n## Abstract\n\n" + abstract + "\n\n" if abstract else "")
        + "## Full Text (first 2000 chars)\n\n"
        + "```\n"
        + _truncate(raw_text, 2000)
        + "\n```\n\n"
        + "## Relations\n\n"
        + "- related_topic [[Embodied Sentience]]\n"
        + "- related_topic [[Council of Dozens]]\n"
        + ("- arxiv_id [[arXiv:" + arxiv_id + "]]\n" if arxiv_id else "")
    )

    tags = ["arxiv", "research", "ingested"]
    if extra_tags:
        tags.extend(extra_tags)
    if arxiv_id:
        tags.append(arxiv_id.replace(".", "-"))

    return {
        "title": guessed_title[:120],  # ADN title length limit
        "content": content,
        "tags": list(dict.fromkeys(tags)),  # deduplicate, preserve order
        "metadata": {
            "source": f"file:{path.name}",
            "arxiv_id": arxiv_id,
            "word_count": word_count,
            "fidelity": "PyMuPDF full-text" if word_count > 100 else "Extraction fallback",
        },
    }


# ---------------------------------------------------------------------------
# ADN Push
# ---------------------------------------------------------------------------


def push_to_adn(data: Dict, folder: str = "research/arxiv", dry_run: bool = False) -> None:
    """
    Push structured paper data to Advanced Memory (ADN) as a note.

    Tries direct import of memops first; falls back to subprocess MCP call.
    """
    note_content = (
        f"# {data['title']}\n\n"
        f"{data['content']}\n\n"
        f"**Source:** {data['metadata']['source']}  \n"
        f"**Fidelity:** {data['metadata']['fidelity']}  \n"
        f"**Word count:** {data['metadata']['word_count']}\n"
    )

    payload = {
        "title": data["title"],
        "content": note_content,
        "folder": folder,
        "tags": data["tags"],
    }

    if dry_run:
        print("[DRY-RUN] Would write note to ADN:")
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return

    # Attempt 1: direct memops import (available when running inside memops venv)
    try:
        from memops import write_note  # type: ignore

        write_note(**payload)
        logger.info(f"ADN note written via direct import: {data['title']}")
        return
    except ImportError:
        pass

    # Attempt 2: subprocess call via `uv run` memops CLI (if available)
    try:
        cmd = [
            "uv",
            "run",
            "python",
            "-c",
            (
                f"from memops import write_note; "
                f"write_note("
                f"title={json.dumps(data['title'])}, "
                f"content={json.dumps(note_content)}, "
                f"folder={json.dumps(folder)}, "
                f"tags={json.dumps(data['tags'])}"
                f")"
            ),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            logger.info(f"ADN note written via subprocess: {data['title']}")
            return
        else:
            logger.warning(f"subprocess ADN push failed: {result.stderr[:200]}")
    except Exception as e:
        logger.warning(f"subprocess ADN push error: {e}")

    # Final fallback: print payload for manual copy
    print("\n[!] ADN push failed — note payload for manual ingestion:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    print("\nInstall memops in your environment or ensure the CLI is accessible via `uv run`.")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    parser = argparse.ArgumentParser(
        description="RoboFang ArXiv RAG Bridge — parse PDF and push to ADN memory"
    )
    parser.add_argument("path", help="Path to the arXiv PDF file")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print ADN payload without writing",
    )
    parser.add_argument(
        "--tags",
        type=str,
        default="",
        help="Comma-separated extra tags, e.g. 'friston,active-inference'",
    )
    parser.add_argument(
        "--folder",
        type=str,
        default="research/arxiv",
        help="ADN folder path (default: research/arxiv)",
    )
    args = parser.parse_args()

    extra_tags = [t.strip() for t in args.tags.split(",") if t.strip()]

    data = parse_arxiv_paper(args.path, extra_tags=extra_tags)
    push_to_adn(data, folder=args.folder, dry_run=args.dry_run)
    print(f"\n[+] Ingestion complete: {data['title']}")
    print(f"    Tags: {', '.join(data['tags'])}")
    print(f"    Fidelity: {data['metadata']['fidelity']}")
    if data["metadata"]["arxiv_id"]:
        print(f"    arXiv ID: {data['metadata']['arxiv_id']}")


if __name__ == "__main__":
    main()
