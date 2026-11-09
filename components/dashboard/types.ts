export interface BulletSuggestion {
  skill: string;
  category: string;
  actionVerb: string;
  bullet: string;
}

export interface TailoringAdvice {
  id: string;
  type: "add" | "remove";
  title: string;
  category: "keyword" | "metric" | "cliche" | "outdated_tech" | "seniority" | "formatting";
  reason: string;
  impact: "high" | "medium" | "low";
  foundSnippet?: string;
  suggestedAction: string;
}

export interface FitAnalysis {
  score: number; // 0 - 100
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: BulletSuggestion[];
  roleArchetype?: string;
  tailoringAdvice?: {
    toAdd: TailoringAdvice[];
    toRemove: TailoringAdvice[];
  };
  categoryBreakdown?: {
    category: string;
    matched: number;
    total: number;
  }[];
  verdict?: {
    label: string;
    description: string;
    color: "emerald" | "amber" | "rose";
  };
  analyzedAt: string;
}

export interface JobApplicationItem {
  _id: string;
  company: string;
  position: string;
  status: string;
  notes?: string;
  location?: string;
  description?: string;
  salaryText?: string;
  responsibilities?: string[];
  requirements?: string[];
  recruiterContact?: string;
  columnId: string;
  boardId: string;
  jobUrl?: string;
  appliedDate?: string | Date;
  tags?: string[];
  salary?: number;
  order: number;
  fitAnalysis?: FitAnalysis;
  lastFollowedUpAt?: string;
  isArchived?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ColumnItem {
  _id: string;
  name: string;
  order: number;
  boardId: string;
  JobApplications: JobApplicationItem[];
}

export interface BoardItem {
  _id: string;
  name: string;
  userId: string;
}

export interface MasterResumeData {
  rawText: string;
  parsedSkills: string[];
  categories?: Record<string, string[]>;
  updatedAt: string;
}
