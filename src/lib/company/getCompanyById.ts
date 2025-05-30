import { supabase } from "@/lib/supabaseClient";
import { companySchema, type Company } from "../validation/companySchema";

export async function getCompanyById(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (error || !data) {
    console.error("Failed to fetch company:", error?.message);
    return null;
  }

  // Validate and parse the data
  try {
    return companySchema.parse(data);
  } catch (e) {
    console.error("Company data validation error:", e);
    return null;
  }
}
