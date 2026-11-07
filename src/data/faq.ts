export interface FaqEntry {
  question: string;
  answer: string;
}

export const faqEntries: FaqEntry[] = [
  {
    question: "What exactly do I get when I buy a prompt?",
    answer:
      "A plain Markdown (.md) file. Drop it into your repo as CLAUDE.md, AGENTS.md, a Cursor rule or a custom command. There is no app to install and no account needed to use it.",
  },
  {
    question: "Can I read a prompt before buying it?",
    answer:
      "Yes. Every listing has a free preview of the first lines of the file, so you can judge its structure and tone before paying.",
  },
  {
    question: "Which AI coding tools do the prompts work with?",
    answer:
      "Any tool that reads Markdown instructions: Claude Code, Cursor, GitHub Copilot, Aider and others. Each listing shows the tools its author tested it with.",
  },
  {
    question: "Do I get updates when the author improves the file?",
    answer:
      "Yes. Purchases include every future version of the file, and you can compare versions before replacing the copy in your repo.",
  },
  {
    question: "How do sellers get paid?",
    answer:
      "Sellers set their own price and are paid for every sale. Write to the seller team to request access while seller onboarding is in early access.",
  },
];
