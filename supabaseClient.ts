

import { createClient, SupabaseClient, PostgrestQueryBuilder } from '@supabase/supabase-js';
import { Customer } from './types';

export interface TypedSupabaseClient extends SupabaseClient {
  from(relation: 'customers'): PostgrestQueryBuilder<Customer>;
  from(relation: 'devices'): PostgrestQueryBuilder<any>; // Add more specific types if needed
  // Add other tables here...
}


// The environment variables are expected to be set up in the deployment environment
// or a local .env file. Vite is configured to make these available.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables SUPABASE_URL and SUPABASE_ANON_KEY must be set.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);