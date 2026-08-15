import dotenv from "dotenv"

// Next.js otomatis membaca .env.local, sedangkan script tsx/node tidak.
// Helper ini memastikan semua script CLI memakai environment yang sama.
dotenv.config({ path: ".env.local" })
dotenv.config()
