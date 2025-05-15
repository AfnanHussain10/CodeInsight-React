export interface DocumentationMetadata {
  name: string;
  timestamp: string;
  fileCount: number;
  files: {
    name: string;
    path: string;
    size: number;
  }[];
}

export interface DocumentationEvaluation {
  quality_score: number;
  completeness_score: number;
  clarity_score: number;
  recommendations: string[];
  error?: string;
}

export interface TreeNode {
  label: string;
  value: string;
  children?: TreeNode[];
}