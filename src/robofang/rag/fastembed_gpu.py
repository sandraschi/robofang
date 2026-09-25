"""Fleet-standard FastEmbed GPU bootstrap."""

from __future__ import annotations

import logging
import os
from collections.abc import Callable
from pathlib import Path

logger = logging.getLogger(__name__)

EMBED_BATCH_SIZE_CPU = 64
EMBED_BATCH_SIZE_GPU = 256


def _env_flag(name: str) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    return raw in ("1", "true", "yes", "on")


def repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[3]


def embed_use_gpu(repo_root: Path | None = None) -> bool:
    if _env_flag("RAG_GPU") or _env_flag("MCD_RAG_GPU"):
        return True
    root = repo_root or repo_root_from_here()
    if (root / ".venv" / "rag-gpu-mode").is_file():
        return True
    return False


def _session_providers(model: object) -> list[str]:
    """ONNX Runtime providers of a fastembed TextEmbedding (private internals: model.model.model)."""
    session = getattr(getattr(model, "model", None), "model", None)
    get_providers: Callable[[], list[str]] | None = getattr(session, "get_providers", None)
    return list(get_providers()) if callable(get_providers) else []


def create_text_embedding(
    model_name: str,
    cache_dir: str,
    *,
    repo_root: Path | None = None,
    batch_cpu: int = EMBED_BATCH_SIZE_CPU,
    batch_gpu: int = EMBED_BATCH_SIZE_GPU,
):
    from fastembed import TextEmbedding

    root = repo_root or repo_root_from_here()
    if embed_use_gpu(root):
        try:
            model = TextEmbedding(
                model_name=model_name,
                cache_dir=cache_dir,
                providers=["CUDAExecutionProvider"],
            )
            providers = _session_providers(model)
            if "CUDAExecutionProvider" in providers:
                logger.info("FastEmbed providers: %s", providers)
                return model, "cuda", batch_gpu
            logger.warning("CUDAExecutionProvider unavailable (%s); using CPU", providers)
        except Exception as exc:
            logger.warning("GPU embed init failed (%s); using CPU", exc)

    # fastembed-gpu wraps onnxruntime-gpu, whose session builder auto-selects
    # CUDA/TensorRT by priority when no providers= is given -- omitting the
    # arg here does NOT mean CPU-only, and this "CPU fallback" would silently
    # stay on CUDA until a cuDNN-only kernel fails at inference time. Force
    # CPUExecutionProvider explicitly.
    model = TextEmbedding(
        model_name=model_name,
        cache_dir=cache_dir,
        providers=["CPUExecutionProvider"],
    )
    logger.info("FastEmbed providers: %s", _session_providers(model))
    return model, "cpu", batch_cpu
