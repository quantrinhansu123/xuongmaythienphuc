const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const DATABASE_URL = envContent.match(/DATABASE_URL=(.+)/)?.[1]?.trim();

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('🚀 Đang chạy migration...');
    console.log('📍 Database:', DATABASE_URL?.split('@')[1]?.split('/')[0]);
    
    const migrationPath = path.join(process.cwd(), 'migrations', 'add_item_categories.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration thành công!');
    console.log('📋 Bảng item_categories đã được tạo');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
