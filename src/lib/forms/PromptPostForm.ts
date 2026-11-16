import { BaseForm } from "@/lib/forms/BaseForm";
import {
  checkCategory,
  check_install_kind,
  checkFile,
  checkKind,
  checkList,
  checkPreviewLineCount,
  checkText,
  checkWorksWith,
  PREVIEW_LINES,
  PROMPT_POST_FIELDS,
  type PromptKind,
  type PromptPostField,
  type ValidationIssue,
} from "@/lib/validation/promptPost";

export interface PromptPostValues {
  kind: PromptKind;
  title: string;
  tagline: string;
  summary: string;
  category: string;
  /** Where the CLI installs the file. Chosen when posting; a revision keeps the post's. */
  install_kind: string;
  meantFor: string;
  highlights: string;
  usageSteps: string;
  worksWith: string[];
  file: File | null;
  previewLineCount: string;
}

const EMPTY_POST: PromptPostValues = {
  kind: "prompt",
  title: "",
  tagline: "",
  summary: "",
  category: "",
  install_kind: "",
  meantFor: "",
  highlights: "",
  usageSteps: "",
  worksWith: [],
  file: null,
  previewLineCount: String(PREVIEW_LINES.default),
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
      case "install_kind":
        return this.is_revision ? null : check_install_kind(values.install_kind);
      case "worksWith":
        return checkWorksWith(values.worksWith);
      case "file":
        return checkFile(values.file, this.is_revision);
      case "previewLineCount":
        return checkPreviewLineCount(values.previewLineCount);
    }
  }

  /** The values as the multipart body the server actions read (the file travels as a File). */
  toFormData(): FormData {
    const formData = new FormData();
    const values = this.values;
    formData.set("kind", values.kind);
    formData.set("title", values.title);
    formData.set("tagline", values.tagline);
    formData.set("summary", values.summary);
    formData.set("category", values.category);
    if (!this.is_revision) formData.set("install_kind", values.install_kind);
    formData.set("meantFor", values.meantFor);
    formData.set("highlights", values.highlights);
    formData.set("usageSteps", values.usageSteps);
    values.worksWith.forEach((tool) => formData.append("worksWith", tool));
    if (values.file) formData.set("file", values.file);
    formData.set("previewLineCount", values.previewLineCount);
    return formData;
  }
}
