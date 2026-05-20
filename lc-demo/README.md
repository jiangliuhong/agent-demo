# agent-demo

一个用于学习 LangChain Agent 开发的 Python 工程，使用 `pyenv` 管理 Python 版本，使用 `uv` 管理虚拟环境、依赖与锁文件。

## 目标

- 固定 Python 版本，避免本机环境漂移
- 用 `uv` 管理依赖、虚拟环境和命令执行
- 提供一个最小 LangChain Agent 示例作为学习入口

## 环境初始化

1. 安装并启用指定 Python 版本：

   ```bash
   pyenv install --skip-existing 3.12.10
   pyenv local 3.12.10
   ```

2. 安装 `uv` 到当前用户目录：

   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   export PATH="$HOME/.local/bin:$PATH"
   ```

3. 创建虚拟环境并安装依赖：

   ```bash
   uv sync
   ```

4. 配置环境变量：

   ```bash
   cp .env.example .env
   ```

## 常用命令

```bash
uv run python -m agent_demo.main
uv run ruff check .
uv run pytest
```

项目依赖只会进入本项目的 `.venv/`，不会污染全局 Python 包环境。

如果当前机器上的 `~/.cache/uv` 不可写，可以这样执行：

```bash
XDG_CACHE_HOME=/tmp/.cache uv run pytest
```

## 当前结构

```text
.
├── .python-version
├── .env.example
├── pyproject.toml
├── README.md
├── src/
│   └── agent_demo/
│       ├── __init__.py
│       ├── main.py
│       └── agents/
│           └── basic_agent.py
└── tests/
    └── test_imports.py
```

## 学习建议

- 先跑通 `main.py`，确认环境变量和模型调用链路没问题
- 再逐步替换为更复杂的工具、记忆、规划与多 Agent 场景
- 每加一类能力，都补一个最小测试或可执行脚本
