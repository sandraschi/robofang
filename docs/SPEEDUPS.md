# Speedups: Python compilation and when to use Rust

Options for making RoboFang faster without rewriting everything, and where Rust fits.

---

## Can Python be compiled for speed?

Yes. Several approaches exist — but “compiled” does not mean “same as Rust/C++.”

| Approach | What it does | Best for |
|----------|--------------|----------|
| **PyPy** | JIT-compiles Python to machine code at runtime | CPU-heavy loops; drop-in for many pure-Python apps. |
| **Cython** | Compiles Python (or Python-like) to C, then to a native extension | Hot numeric/tight loops; add C types for large gains. |
| **Nuitka** | Compiles Python to C, then to a native binary | Whole-app compilation; often 2–4× faster, better startup. |
| **mypyc** | Compiles type-annotated Python to C extensions | Gradual typing; good for already-typed codebases. |

---

## Reality check

- **I/O-bound** (HTTP, MCP, DB): Compilation helps little; you’re waiting on the network or disk.
- **CPU-bound** (math, tight loops): PyPy, Cython, or Nuitka can give large speedups (often 2–10× or more on hot code).
- **GIL**: Only one Python thread runs Python bytecode at a time. PyPy has a GIL; Cython can release it with `with nogil:`; Nuitka still has a GIL unless you use extensions that release it. So multi-threaded CPU-bound Python still doesn’t scale like Rust/C++ without care.
- **Ecosystem**: C extensions (numpy, fastmcp, etc.) must be compatible. PyPy supports a smaller set; Cython and Nuitka work with the normal C-API.

---

## For RoboFang

- **Worth trying**: Nuitka for the bridge/orchestrator (startup and request handling), or Cython/PyPy on a few hot inner loops if you’ve profiled and found CPU-bound hotspots.
- **Won’t fix**: Latency dominated by MCP hand calls, network, or LLM round-trips; compilation doesn’t remove those.
- **OSC / 30 Hz**: If the hot path is “Python loop sending OSC,” Cython or Nuitka might reduce overhead enough; for truly hard real-time, a small Rust (or C) core for that loop is still the safer bet.

---

## When to use Rust (like OpenFang)

- **Don’t** rewrite the main stack (orchestrator, bridge, MCP server, hands) in Rust for performance alone. The MCP hands are Python and must stay Python; the bottleneck is often “orchestrator → Python hand → tool,” so making the orchestrator Rust doesn’t remove that.
- **Do** consider Rust for **small, well-defined, time-critical subsystems** that:
  - have hard timing requirements, and  
  - can be separated from “call Python MCP hand.”

Examples:

- **OSC / joint control**: A small loop that only does “read targets → send OSC at 30 Hz.” Implement as a Rust binary or library (PyO3) that receives targets from Python and does the wire I/O. Python hands stay as-is; they “command” the Rust side.
- **Telemetry/sensor aggregation**: A “never drop a frame” path (sensor → buffer → forward) can be Rust while the rest stays Python.

**Summary**: Rust for isolated real-time paths (e.g. OSC sender); Python (optionally compiled) for the rest. The limit is “Python hands in the loop,” not the language of the orchestrator.

---

## References

- [Nuitka](https://nuitka.net/) — Python to C compiler  
- [Cython](https://cython.org/) — C-extensions from Python  
- [PyPy](https://www.pypy.org/) — JIT for Python  
- [mypyc](https://mypyc.readthedocs.io/) — typed Python to C extension
