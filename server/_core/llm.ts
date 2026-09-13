type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type InvokeLLMInput = {
  model?: string;
  messages: LLMMessage[];
  maxTokens?: number;
};

type InvokeLLMOutput = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

export async function invokeLLM(
  input: InvokeLLMInput,
): Promise<InvokeLLMOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  const apiBase =
    process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1";

  if (!apiKey ) {
    return {
      choices: [
        {
          message: {
            content:
              "You kept showing up; that is how momentum becomes yours.",
          },
        },
      ],
    };
  }

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: input.model ?? "gpt-5-mini",
      messages: input.messages,
      max_tokens: input.maxTokens ?? 256,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with HTTP ${response.status}`);
  }

  return (await response.json()) as InvokeLLMOutput;
}
