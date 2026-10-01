   import * as QueryParams from "expo-auth-session/build/QueryParams";
   import { supabase } from "@/utils/supabase";

   export async function createSessionFromUrl(url: string) {
     const { params, errorCode } = QueryParams.getQueryParams(url);
     if (errorCode) throw new Error(errorCode);
     if (params.code) {
       await supabase.auth.exchangeCodeForSession(params.code);
     } else if (params.access_token) {
       await supabase.auth.setSession({
         access_token: params.access_token,
         refresh_token: params.refresh_token,
       });
     }
   }