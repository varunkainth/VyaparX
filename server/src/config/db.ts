import { Pool } from "pg"
import dotenv from "dotenv"
import env, { RESOLVED_DATABASE_URL } from "./env";
dotenv.config()

const pool = new Pool({
    max: 10,
    idleTimeoutMillis: 10000,  // Reduced to 10s for Neon serverless
    connectionTimeoutMillis: 10000,  // Increased to 10s for better reliability
    connectionString: RESOLVED_DATABASE_URL,
    ...(env.DATABASE_SSL_ENABLED
        ? {
              ssl: {
                  rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED,
              },
          }
        : {}),
});

pool.on("connect", () => {
    console.log("Connected to PostgresDB")
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  // Don't exit process - let the pool handle reconnection
});

export default pool
