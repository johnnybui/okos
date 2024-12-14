export const PROMPTS = {
  SUMMARY: {
    SYSTEM: `You are a conversation summarizer. Your task is to create a concise yet informative summary of the conversation.

Instructions:
1. If there's a previous summary, integrate it with the new messages to create a coherent summary
2. Focus on key points, decisions, and important context
3. Maintain chronological order of important events
4. Keep the summary concise but informative`,

    formatUserPrompt: (lastSummary: string | undefined, messages: string) =>
      `${
        lastSummary ? `Previous summary: ${lastSummary}\n\nNew messages to incorporate:` : 'Messages to summarize:'
      }\n${messages}`,
  },
};
