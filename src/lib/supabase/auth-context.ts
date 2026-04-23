import type { User } from "@supabase/supabase-js"
import { createClient } from "./server"
import { createAdminClient } from "./admin"

/**
 * Returns the current user, a superadmin flag, and the DB client to use.
 * - For regular users: the normal SSR Supabase client (RLS enforced).
 * - For superadmin users: the service-role admin client (RLS bypassed),
 *   so they can read/write any row regardless of ownership.
 *
 * Server actions should still drop their own `user_id = user.id` filters
 * when `isSuperadmin` is true.
 */
export async function getAuthContext(): Promise<{
  user: User | null
  isSuperadmin: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isSuperadmin = user?.user_metadata?.superadmin === true
  const db = isSuperadmin ? createAdminClient() : supabase
  return { user, isSuperadmin, db, supabase }
}
