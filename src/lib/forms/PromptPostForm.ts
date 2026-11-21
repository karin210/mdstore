import { BaseForm } from "@/lib/forms/BaseForm";
import {
  checkCategory,
  checkFile,
  checkKind,
  checkList,
  checkPreviewLineCount,
  checkText,
  checkWorksWith,
  check_output_examples,
  check_tested_models,
  PREVIEW_LINES,
  PROMPT_POST_FIELDS,
  type PromptKind,
  type PromptPostField,
  type TestedModelChoice,
  type ValidationIssue,
} from "@/lib/validation/promptPost";

/**
 * One output example on the form: a picked image (`file`, uploaded on submit; `path` stays null until
 * then) or one already stored (`path` set, no file), like those of the previous version.
 */
export interface OutputExampleItem {
  id: string;
  caption: string;
  path: string | null;
  file: File | null;
}

export interface PromptPostValues {
  kind: PromptKind;
  title: string;
  tagline: string;
  summary: string;
  category: string;
  meantFor: string;
  highlights: string;
  usageSteps: string;
  worksWith: string[];
  testedModels: TestedModelChoice[];
  file: File | null;
  previewLineCount: string;
  outputExamples: OutputExampleItem[];
}

const EMPTY_POST: PromptPostValues = {
  kind: "prompt",
  title: "",
  tagline: "",
  summary: "",
  category: "",
  meantFor: "",
  highlights: "",
  usageSteps: "",
  worksWith: [],
  testedModels: [],
  file: null,
  previewLineCount: String(PREVIEW_LINES.default),
  outputExamples: [],
};

/**
 * The upload form's fields and rules; the server actions re-check everything.
 * - New post: starts empty and needs the file.
 * - New revision of a post: starts from the latest revision's values; the file is optional
 *   (left out, the previous file is kept).
 */
export class PromptPostForm extends BaseForm<PromptPostField, PromptPostValues, ValidationIssue> {
  private readonly is_revision: boolean;

  constructor(initial_values?: Omit<PromptPostValues, "file">) {
    super(initial_values ? { ...initial_values, file: null } : EMPTY_POST, PROMPT_POST_FIELDS);
    this.is_revision = initial_values !== undefined;
  }

  protected getFieldIssue(field: PromptPostField): ValidationIssue | null {
    const values = this.values;
    switch (field) {
      case "kind":
        return checkKind(values.kind);
      case "title":
      case "tagline":
      case "summary":
        return checkText(field, values[field]);
      case "meantFor":
      case "highlights":
      case "usageSteps":
        return checkList(field, values[field]);
      case "category":
        return checkCategory(values.category);
      case "worksWith":
        return checkWorksWith(values.worksWith);
      case "testedModels":
        return check_tested_models(values.testedModels);
      case "file":
        return checkFile(values.file, this.is_revision);
      case "previewLineCount":
        return checkPreviewLineCount(values.previewLineCount);
      case "outputExamples":
        return check_output_examples(values.outputExamples);
    }
  }

  /**
   * The values as the multipart body the server actions read (the file travels as a File). The output
   * examples travel as storage paths, so every picked image must be uploaded first (those without a path are left out).
   */
  toFormData(): FormData {
    const formData = new FormData();
    const values = this.values;
    formData.set("kind", values.kind);
    formData.set("title", values.title);
    formData.set("tagline", values.tagline);
    formData.set("summary", values.summary);
    formData.set("category", values.category);
    formData.set("meantFor", values.meantFor);
    formData.set("highlights", values.highlights);
    formData.set("usageSteps", values.usageSteps);
    values.worksWith.forEach((tool) => formData.append("worksWith", tool));
    // Two lists, the way the database stores them: every tested model, then the recommended ones.
    values.testedModels.forEach((model) => {
      formData.append("testedModels", model.model_id);
      if (model.recommended) formData.append("recommendedModels", model.model_id);
    });
    values.outputExamples.forEach((example) => {
      if (!example.path) return;
      formData.append("outputExample", example.path);
      formData.append("outputExampleCaption", example.caption);
    });
    if (values.file) formData.set("file", values.file);
    formData.set("previewLineCount", values.previewLineCount);
    return formData;
  }
}
