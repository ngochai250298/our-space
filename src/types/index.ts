/** The couple — full access to everything. */
export type CoupleRole = "anh" | "em";
/** Family members — restricted view (no couple-private sections). */
export type FamilyRole = "thuong" | "thuan" | "nhinhi" | "thinh";
export type Role = CoupleRole | FamilyRole;

export type Gender = "male" | "female";
export type AccountKind = "couple" | "family";

export interface Session {
  role: Role;
  displayName: string;
  kind: AccountKind;
  gender: Gender;
  loggedInAt: number;
}

export interface DiaryEntry {
  id: string;
  author: Role;
  /** ISO date (yyyy-mm-dd) the entry belongs to */
  date: string;
  content: string;
  photos: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Letter {
  id: string;
  from: Role;
  to: Role;
  title: string;
  body: string;
  createdAt: number;
  readAt?: number;
  /** Hidden from the sender's "Đã gửi" tab (they deleted their own copy). */
  hiddenByFrom?: boolean;
  /** Hidden from the recipient's "Hộp thư đến" (they deleted their own copy). */
  hiddenByTo?: boolean;
}

export interface Photo {
  id: string;
  album: string;
  /** Public URL (cloud) or data URL (on-device fallback) */
  url: string;
  /** Path inside the Supabase Storage bucket, when stored on the cloud */
  storagePath?: string;
  caption?: string;
  uploadedBy: Role;
  createdAt: number;
}

export interface BucketItem {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  url?: string;
  note?: string;
  addedBy: Role;
  createdAt: number;
}

export interface OpenWhenEnvelope {
  id: string;
  label: string;
  emoji: string;
  body: string;
  from: Role;
  openedAt?: number;
}

export interface PersonPlace {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface AppSettings {
  /** ISO date the relationship started */
  anniversary: string;
  /** ISO date of the next meeting */
  nextMeeting: string;
  nextMeetingLabel: string;
  theme: "light" | "dark";
  /** Home cities of the couple (map fallbacks) */
  places: Record<CoupleRole, PersonPlace>;
}

export interface LiveLocation {
  role: Role;
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: number;
  /** true when this is a fallback/default position, not a real GPS fix */
  approx?: boolean;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
