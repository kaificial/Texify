
export interface ConversionResult {
  latex: string;
  confidence: number;
}

export enum AppState {
  IDLE = 'IDLE',
  DRAWING = 'DRAWING',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  RESULT = 'BOOM'
}

export interface HistoryItem {
  id: string;
  latex: string;
  timestamp: number;
  image?: string;
}
