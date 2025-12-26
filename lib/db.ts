import { Pool, PoolConfig } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

// Tối ưu connection pool cho production
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings tối ưu cho serverless/production
  max: isProduction ? 10 : 20, // Giảm max connections cho serverless
  min: isProduction ? 1 : 2,
  idleTimeoutMillis: isProduction ? 10000 : 30000, // Đóng nhanh hơn trong production
  connectionTimeoutMillis: 5000, // Giảm timeout để fail fast
  // Statement timeout để tránh query chạy quá lâu
  statement_timeout: 30000, // 30s max cho mỗi query
  // SSL cho production
  ...(isProduction && {
    ssl: {
      rejectUnauthorized: false,
    },
  }),
};

// Singleton pattern để tránh tạo nhiều pool trong serverless
declare global {
  var pgPool: Pool | undefined;
}

const pool = global.pgPool || new Pool(poolConfig);

if (!isProduction) {
  global.pgPool = pool;
}

// Xử lý lỗi pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Warm up connection khi khởi động
pool.on('connect', () => {
  // Connection established
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Chỉ log query chậm > 200ms trong production
    if (duration > 200) {
      console.warn('Slow query', { 
        duration: `${duration}ms`, 
        rows: res.rowCount,
        query: text.substring(0, 100) 
      });
    }
    
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('Query error', { 
      duration: `${duration}ms`, 
      error,
      query: text.substring(0, 100) 
    });
    throw error;
  }
};

// Helper để lấy connection từ pool (cho transactions)
export const getClient = () => pool.connect();

export default pool;
