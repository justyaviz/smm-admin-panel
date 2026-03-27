import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

// asosiy query function
export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();

// pool ham kerak bo‘lsa
export default pool;
