export interface Activity {
  id: string;
  label: string;
  enabled: boolean;
}

export interface Session {
  id: string;
  dateISO: string; // e.g. 2026-09-24
  timestamp: number;
  durationSec: number;
  activities: string[]; // labels of activities enabled during this session
}

export interface VaultPhoto {
  id: string;
  uri: string;
  dateISO: string;
  timestamp: number;
  note?: string;
}

export interface ThreadMessage {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface Thread {
  id: string;
  title: string;
  category: string;
  messages: ThreadMessage[];
}
