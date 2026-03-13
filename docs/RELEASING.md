# Releasing RoboFang

Releases are created by the [Release](https://github.com/sandraschi/robofang/actions/workflow/release.yml) workflow. No manual uploads or config edits are required.

## How to release

### Option A: Tag push (recommended)

1. Ensure `main` is in good shape (CI green, CHANGELOG.md updated if you care about human-readable notes).
2. Create and push an annotated tag:

   ```powershell
   git tag -a v0.4.0 -m "Release v0.4.0"
   git push origin v0.4.0
   ```

3. The workflow runs on the tag: lint, format, test, build wheel/sdist, generate release notes from commits since the previous tag, and create a GitHub Release with artifacts attached. The **version in the built package is taken from the tag** (pyproject.toml is updated in the workflow before build).

### Option B: Manual dispatch

1. In GitHub: **Actions** → **Release** → **Run workflow**.
2. Enter the version (e.g. `v0.4.0`) and run.
3. The workflow uses the current branch/commit, sets that version in the build, creates the release and **creates the tag** on the current commit. Prefer Option A so the tag and commit are in sync with your usual flow.

## What the workflow does

- **Extract version** from the tag (or from the manual input).
- **Sync version** into `pyproject.toml` so the built wheel/sdist have the correct version.
- **Lint** (ruff check), **format check** (ruff format --check), **test** (pytest).
- **Build** wheel and sdist (`python -m build`).
- **Generate changelog**: commits from previous tag to HEAD (or full history if no previous tag).
- **Create GitHub Release**: title "RoboFang vX.Y.Z", body with changelog and install instructions, attach `dist/*.whl` and `dist/*.tar.gz`. Versions containing `alpha`, `beta`, or `rc` are marked as prerelease.

## Versioning

Use [Semantic Versioning](https://semver.org/) (e.g. `v0.3.0`, `v1.0.0`). Pre-releases: `v0.4.0-alpha.1`, `v0.4.0-beta.2`, `v0.4.0rc1`.

## PyPI (future)

The workflow does not publish to PyPI yet. To add it, configure `TWINE_USERNAME` / `TWINE_PASSWORD` (or token) as repo secrets and add a step after "Create GitHub Release" to run `twine upload dist/*`.
