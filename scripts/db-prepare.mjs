import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function readSql(file) {
  const p = path.join(process.cwd(), file)
  return fs.readFileSync(p, 'utf8')
}

function splitStatements(sql) {
  // naive splitter: split on semicolons that end a line
  return sql
    .split(/;\s*\n/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

async function runSqlFile(file) {
  const sql = readSql(file)
  const statements = splitStatements(sql)
  for (const stmt of statements) {
    // Skip psql meta commands or comments
    if (stmt.startsWith('--')) continue
    // Some CREATE EXTENSION may be repeated; run individually
    // eslint-disable-next-line no-await-in-loop
    try {
      await prisma.$executeRawUnsafe(stmt)
    } catch (e) {
      const msg = String(e?.message || e)
      // ignore "already exists" or duplicate constraint errors to make idempotent
      if (/already exists/i.test(msg) || /duplicate/i.test(msg) || /exists/i.test(msg)) {
        continue
      }
      throw e
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }
  console.log('Applying dedupe schema (extensions/tables/indexes)...')
  await runSqlFile('create_dedupe_schema.sql')
  await runSqlFile('create_dedupe_extensions_and_indexes.sql')
  // Create or replace SQL functions (scorer)
  await runSqlFile('src/lib/sql/score_pair.sql')
  console.log('Dedupe schema ensured')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


