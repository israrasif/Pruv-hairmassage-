// constants/env.ts
function required(name: string, value: string | undefined): string {
  if (!value)
    throw new Error(
      `Missing env var ${name}. Check .env or EAS environment variables.`,
    );
  return value;
}

export const env = {
  supabaseUrl: required(
    "EXPO_PUBLIC_SUPABASE_URL",
    process.env.EXPO_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  // revenueCatAndroidKey: required(
  //   "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
  //   process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  // ),
  // revenueCatIosKey: required(
  //   "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
  //   process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  // ),
};
