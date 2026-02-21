export interface CustomField {
  key: string;
  value: string;
}

export interface JobApplication {
  _id: string;
  company: string;
  position: string;
  location?: string;
  status: string;
  notes?: string;
  salary?: string;
  jobUrl?: string;
  cvVersion?: string;
  coverLetterVersion?: string;
  cvDocumentId?: string;
  coverLetterDocumentId?: string;
  cvFileName?: string;
  coverLetterFileName?: string;
  order: number;
  columnId?: string;
  tags?: string[];
  description?: string;
  customFields?: CustomField[];
}

export interface Column {
  _id: string;
  name: string;
  order: number;
  jobApplications: JobApplication[];
}

export interface Board {
  _id: string;
  name: string;
  columns: Column[];
}
