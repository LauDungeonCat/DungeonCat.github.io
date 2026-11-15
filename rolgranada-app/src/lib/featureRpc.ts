import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { FeatureDatabase } from "./feature-database.types";

export const featureSupabase = supabase as SupabaseClient<FeatureDatabase>;

type FunctionName = keyof FeatureDatabase["public"]["Functions"];
type FunctionArgs<Name extends FunctionName> = FeatureDatabase["public"]["Functions"][Name]["Args"];
type FunctionResult<Name extends FunctionName> = FeatureDatabase["public"]["Functions"][Name]["Returns"];

export async function featureRpc<Name extends FunctionName>(
  name: Name,
  args: FunctionArgs<Name>,
): Promise<FunctionResult<Name>> {
  const { data, error } = await featureSupabase.rpc(name, args);
  if (error) throw error;
  return data;
}
