from agent_demo.agents.basic_agent import build_learning_prompt


def main() -> None:
    prompt = build_learning_prompt()
    print(prompt)


if __name__ == "__main__":
    main()
