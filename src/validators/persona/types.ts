export type ValidationSeverity = "ERROR" | "WARN";

export type ValidationIssue = {
  ruleId: string;
  severity: ValidationSeverity;
  message: string;
};

export type ValidationResult = {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

export type FrontmatterValidationResult = ValidationResult & {
  frontmatter: Record<string, unknown> | null;
};
