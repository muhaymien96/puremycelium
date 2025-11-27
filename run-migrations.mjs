import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = 'https://acxhhfwvxtkvxkvmfiep.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjeGhoZnd2eHRrdnhrdm1maWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI0MzQyNiwiZXhwIjoyMDc5ODE5NDI2fQ.aRgIj9G-JPgLhglZmU9OWH3WSDsCnyqEXfuozFCUDRA'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigrations() {
  const migrationsDir = join(__dirname, 'supabase', 'migrations')
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log('🚀 Running migrations...\n')

  for (const file of files) {
    try {
      console.log(`Applying: ${file}`)
      const sql = readFileSync(join(migrationsDir, file), 'utf8')
      
      const { error } = await supabase.rpc('exec_sql', { sql_string: sql })
      
      if (error) {
        console.error(`❌ Error in ${file}:`, error.message)
      } else {
        console.log(`✅ Successfully applied: ${file}\n`)
      }
    } catch (err) {
      console.error(`❌ Failed to apply ${file}:`, err.message)
    }
  }

  console.log('✨ Migration process completed!')
}

runMigrations().catch(console.error)
