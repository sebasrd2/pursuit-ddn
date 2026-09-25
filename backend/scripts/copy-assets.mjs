import fs from 'node:fs'

fs.cpSync('src/db/migrations', 'dist/db/migrations', { recursive: true })
