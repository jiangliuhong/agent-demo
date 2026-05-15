from agent_demo.agents.basic_agent import build_learning_prompt


def test_build_learning_prompt() -> None:
    prompt = build_learning_prompt()
    assert "LangChain agent learning project is ready." in prompt
