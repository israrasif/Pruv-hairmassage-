// utils/analyzeHair.ts
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { supabase } from "@/utils/supabase";

export type Scan = {
  id: string;
  density: number;
  scalp_coverage: number;
  shine: number;
  integrity: number;
  overall: number;
  notes: string;
  photo_tips: string;
  created_at: string;
  photo_path: string;
};

export type AnalyzeResult =
  | { ok: true; scan: Scan }
  | { ok: false; reason: "unusable"; notes: string; photoTips: string }
  | { ok: false; reason: "error"; message: string };

export async function analyzeHairPhoto(photoUri: string): Promise<AnalyzeResult> {
  try {
    // 1. Shrink the photo (faster upload, fewer tokens)
    const ref = await ImageManipulator.manipulate(photoUri)
      .resize({ width: 1024 })
      .renderAsync();
    const small = await ref.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });

    // 2. Upload to the private bucket, in a folder named after the user's id
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      return { ok: false, reason: "error", message: "Please sign in again." };
    }

    const path = `${userId}/${Date.now()}.jpg`;
    // Read the real file bytes (fetch(file://...) can silently return an empty file in React Native)
    const bytes = await new File(small.uri).bytes();
    if (!bytes.length) {
      return { ok: false, reason: "error", message: "Couldn't read the photo. Please try again." };
    }

    const { error: upErr } = await supabase.storage
      .from("hair-photos")
      .upload(path, bytes, { contentType: "image/jpeg" });
    if (upErr) {
      return { ok: false, reason: "error", message: "Upload failed. Check your connection." };
    }

    // 3. Ask the Edge Function to analyze it (login token is sent automatically)
    const { data, error } = await supabase.functions.invoke("analyze-hair", {
      body: { path },
    });

    if (error) {
      let message = "Analysis failed, please try again.";
      try {
        const body = await (error as any).context?.json?.();
        if (body?.error) message = body.error;
      } catch {}
      return { ok: false, reason: "error", message };
    }

    if (data?.usable === false) {
      return {
        ok: false,
        reason: "unusable",
        notes: data.notes ?? "",
        photoTips: data.photo_tips ?? "",
      };
    }

    return { ok: true, scan: data.scan as Scan };
  } catch {
    return { ok: false, reason: "error", message: "Something went wrong. Please try again." };
  }
}

// Past scans (oldest first) for history / trend
export async function fetchScans(): Promise<Scan[]> {
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Scan[];
}