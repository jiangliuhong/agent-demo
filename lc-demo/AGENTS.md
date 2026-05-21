# Repository Guidelines

## Project Structure & Module Organization

This repository is a small Python project for learning LangChain agents. Application code lives under `src/agent_demo/`, with the CLI entry point in `src/agent_demo/main.py` and agent-specific code in `src/agent_demo/agents/`. Tests live in `tests/` and currently use the same package import path as production code. Project metadata, tool settings, and dependencies are defined in `pyproject.toml`.

## Build, Test, and Development Commands

Use `uv` for all environment and command execution.

- `uv sync` installs runtime and dev dependencies into `.venv/`.
- `uv run python -m agent_demo.main` runs the current scaffold locally.
- `uv run pytest` runs the full test suite.
- `uv run pytest tests/test_imports.py::test_build_learning_prompt` runs one test.
- `uv run ruff check .` runs lint and import-order checks.
- `uv run ruff check --fix .` applies safe auto-fixes.

If the machine cannot write to `~/.cache/uv`, prefix commands with `XDG_CACHE_HOME=/tmp/.cache`.

## Coding Style & Naming Conventions

Target Python is `3.12.10`, with line length capped at 100 by Ruff. Follow the existing style: 4-space indentation, explicit type hints on public functions, and small, focused modules. Use `snake_case` for files, functions, and variables; use clear module names such as `basic_agent.py`. Keep new agent implementations under `src/agent_demo/agents/` unless they justify a new subpackage.

## Testing Guidelines

Pytest is configured in `pyproject.toml` with `src` on the import path. Add tests in `tests/` and name them `test_*.py`. Prefer one behavior per test and keep assertions specific, as in `tests/test_imports.py`. Run `uv run pytest` before opening a PR.

## Commit & Pull Request Guidelines

Recent history includes both descriptive commits and weak placeholders, so prefer short, imperative subjects with an optional type prefix, for example `feat: add chat model scaffold` or `test: cover env fallback`. Keep pull requests focused. Include a brief summary, note any required `.env` or model configuration changes, and attach test or lint results. Include console output or screenshots only when behavior changes are user-visible.

## Environment & Configuration Tips

Copy `.env.example` to `.env` and set `OPENAI_API_KEY` and `OPENAI_MODEL` before running agent code. Do not commit secrets or local `.env` changes.
