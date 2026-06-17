"""Index repo docs into RoboFang LanceDB — use with just rag-gpu (venv python, not uv run)."""

from __future__ import annotations

from pathlib import Path

from robofang.core.robofang_rag import RoboFangRAG


def main() -> int:
    repo = Path(__file__).resolve().parents[1]
    docs_root = repo / "docs"
    rag = RoboFangRAG(db_path=str(repo / "data" / "lancedb"))

    documents = []
    if docs_root.is_dir():
        for md in docs_root.rglob("*.md"):
            try:
                text = md.read_text(encoding="utf-8")
            except OSError:
                continue
            if not text.strip():
                continue
            rel = md.relative_to(docs_root).as_posix()
            documents.append(
                {
                    "id": rel,
                    "content": text,
                    "metadata": {"path": rel},
                    "source": rel,
                }
            )

    if not documents:
        print("[rag] No markdown files under docs/.")
        return 1

    rag.add_documents(documents, overwrite=True)
    print(f"[rag] Indexed {len(documents)} documents.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
