import app from './app'
import { query } from './db/connection'
import * as fs from 'fs'
import * as path from 'path'

const PORT = process.env.PORT || 5000

// Initialize database
async function initializeDatabase() {
  try {
    console.log('Initializing database...')

    // Read and execute migrations
    const migrationPath = path.join(__dirname, 'db/migrations/001_init_schema.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim())

    for (const statement of statements) {
      if (statement.trim()) {
        await query(statement)
      }
    }

    console.log('Database initialized successfully!')
  } catch (error) {
    console.error('Database initialization error:', error)
    process.exit(1)
  }
}

async function start() {
  try {
    // Initialize database
    await initializeDatabase()

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`)
      console.log(`📊 API available at http://localhost:${PORT}/api`)
      console.log(`💚 Health check at http://localhost:${PORT}/health`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
