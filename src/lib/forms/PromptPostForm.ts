import { BaseForm } from "@/lib/forms/BaseForm";
import {
  checkAuthorHandle,
  checkCategory,
  check_kind,
  checkFile,
  checkList,
  checkPreviewLineCount,
  checkText,
  checkWorksWith,
  PREVIEW_LINES,
  PROMPT_POST_FIELDS,
  type PromptPostField,
  type ValidationIssue,
} from "@/lib/validation/promptPost";

export interface PromptPostValues {
  title: string;
  tagline: string;
  summary: string;
  category: string;
  kind: string;
  authorHandle: string;
  meantFor: string;
  highlights: string;
  usageSteps: string;
  worksWith: string[];
  file: File | null;
  previewLineCount: string;
}

const EMPTY_POST: PromptPostValues = {
  title: "",
  tagline: "",
  summary: "",
  category: "",
  kind: "",
  authorHandle: "",
  meantFor: "",
  highlights: "",
  usageSteps: "",
  worksWith: [],
  file: null,
  previewLineCount: String(PREVIEW_LINES.default),
};

/** The upload form's fields and rules; the create action re-checks everything on the server. */
export class PromptPostForm extends BaseForm<PromptPostField, PromptPostValues, ValidationIssue> {
  constructor() {
    super(EMPTY_POST, PROMPT_POST_FIELDS);
  }

  protected getFieldIssue(field: PromptPostField): ValidationIssue | null {
    const values = this.values;
    switch (field) {
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
      case "kind":
        return check_kind(values.kind);
      case "authorHandle":
        return checkAuthorHandle(values.authorHandle);
      case "worksWith":
        return checkWorksWith(values.worksWith);
      case "file":
        return checkFile(values.file);
      case "previewLineCount":
        return checkPreviewLineCount(values.previewLineCount);
    }
  }

  /** The values as the multipart body the create action reads (the file travels as a File). */
  toFormData(locale: string): FormData {
    const formData = new FormData();
    const values = this.values;
    formData.set("locale", locale);
    formData.set("title", values.title);
    formData.set("tagline", values.tagline);
    formData.set("summary", values.summary);
    formData.set("category", values.category);
    formData.set("kind", values.kind);
    formData.set("authorHandle", values.authorHandle);
    formData.set("meantFor", values.meantFor);
    formData.set("highlights", values.highlights);
    formData.set("usageSteps", values.usageSteps);
    values.worksWith.forEach((tool) => formData.append("worksWith", tool));
    if (values.file) formData.set("file", values.file);
    formData.set("previewLineCount", values.previewLineCount);
    return formData;
  }
}
