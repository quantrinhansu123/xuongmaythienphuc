import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('🚀 Đang chạy migration...');
    
    const migrationPath = path.join(process.cwd(), 'migrations', 'add_item_categories.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration thành công!');
    console.log('📋 Bảng item_categories đã được tạo');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy migration:', error);
    process.exit(1);
  }
}

runMigration();
