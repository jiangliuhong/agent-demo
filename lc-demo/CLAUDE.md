# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
uv sync                    # Install dependencies into .venv/
uv run python -m agent_demo.main   # Run the app
uv run pytest              # Run all tests
uv run pytest tests/test_foo.py::test_bar  # Run a single test
uv run ruff check .        # Lint
uv run ruff check --fix .  # Lint with auto-fix
```

If `~/.cache/uv` is not writable, prefix with `XDG_CACHE_HOME=/tmp/.cache`.

## Environment

- Python 3.12.10 (pinned via `.python-version`, managed by pyenv)
- Requires a `.env` file (copy from `.env.example`) with `OPENAI_API_KEY` and `OPENAI_MODEL`
- Uses `uv` for all venv/dependency management — do not use pip directly

## Architecture

This is an early-stage LangChain agent learning project using the `src/` layout.

- `src/agent_demo/main.py` — entry point, currently calls into the agent scaffold
- `src/agent_demo/agents/` — agent implementations, starting with `basic_agent.py` (scaffold)
- `tests/` — pytest tests, configured with `pythonpath = ["src"]` so imports work as `agent_demo.*`

The project is structured to grow from a minimal scaffold into multi-tool, multi-agent scenarios. New agent capabilities should be added as modules under `src/agent_demo/agents/` or new subpackages alongside it.
