import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export type SkillLevel = "beginner" | "intermediate" | "expert";
export type InitAction = "resume" | "reinit" | "cancel";

export type WizardConfig = {
  projectName: string;
  userName: string;
  skillLevel: SkillLevel;
  enforcementStrictness: "low" | "medium" | "high";
};

export type PromptFn = (question: string) => Promise<string>;

export type RunInitWizardOptions = {
  yes: boolean;
  hasPreviousInit: boolean;
  prompt?: PromptFn;
};

export type WizardResult = {
  action: InitAction;
  config: WizardConfig;
};

const DEFAULT_WIZARD_CONFIG: WizardConfig = {
  projectName: "",
  userName: "",
  skillLevel: "intermediate",
  enforcementStrictness: "medium"
};

const SKILL_LEVELS: SkillLevel[] = ["beginner", "intermediate", "expert"];

const toEnforcementStrictness = (skillLevel: SkillLevel): WizardConfig["enforcementStrictness"] => {
  if (skillLevel === "beginner") {
    return "high";
  }

  if (skillLevel === "expert") {
    return "low";
  }

  return "medium";
};

const normalizeSkillLevel = (value: string): SkillLevel => {
  const normalized = value.trim().toLowerCase();
  if (SKILL_LEVELS.includes(normalized as SkillLevel)) {
    return normalized as SkillLevel;
  }

  return DEFAULT_WIZARD_CONFIG.skillLevel;
};

const askWithDefault = async (
  prompt: PromptFn,
  question: string,
  fallback: string
): Promise<string> => {
  const answer = (await prompt(question)).trim();
  return answer.length > 0 ? answer : fallback;
};

const askInteractiveConfig = async (prompt: PromptFn): Promise<WizardConfig> => {
  const projectName = await askWithDefault(prompt, "Project name (optional): ", "");
  const userName = await askWithDefault(prompt, "Your name (optional): ", "");
  const skillAnswer = await askWithDefault(
    prompt,
    "Skill level [beginner|intermediate|expert] (default: intermediate): ",
    "intermediate"
  );
  const skillLevel = normalizeSkillLevel(skillAnswer);

  return {
    projectName,
    userName,
    skillLevel,
    enforcementStrictness: toEnforcementStrictness(skillLevel)
  };
};

export const createConsolePrompt = (): { prompt: PromptFn; close: () => void } => {
  const rl = createInterface({ input, output });
  return {
    prompt: async (question: string): Promise<string> => rl.question(question),
    close: () => rl.close()
  };
};

export const runInitWizard = async (options: RunInitWizardOptions): Promise<WizardResult> => {
  if (options.yes) {
    if (options.hasPreviousInit) {
      return {
        action: "resume",
        config: DEFAULT_WIZARD_CONFIG
      };
    }

    return {
      action: "reinit",
      config: DEFAULT_WIZARD_CONFIG
    };
  }

  if (!options.prompt) {
    throw new Error("Interactive mode requires a prompt function");
  }

  if (options.hasPreviousInit) {
    const choice = (await options.prompt("Existing .sinfonia detected [resume|re-init|cancel]: "))
      .trim()
      .toLowerCase();

    if (choice === "cancel") {
      return {
        action: "cancel",
        config: DEFAULT_WIZARD_CONFIG
      };
    }

    if (choice === "resume") {
      return {
        action: "resume",
        config: DEFAULT_WIZARD_CONFIG
      };
    }
  }

  const config = await askInteractiveConfig(options.prompt);
  return {
    action: "reinit",
    config
  };
};
