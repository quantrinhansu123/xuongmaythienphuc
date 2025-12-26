-- =====================================================
-- MIGRATION: Xóa phân quyền ADMIN trong database
-- Lý do: ADMIN có toàn quyền tự động, không cần lưu trong role_permissions
-- Ngày: 2025-11-19
-- =====================================================

-- Xóa tất cả permissions của role ADMIN
DELETE FROM role_permissions 
WHERE role_id = (SELECT id FROM roles WHERE role_code = 'ADMIN');

-- Thêm comment để ghi nhớ
COMMENT ON TABLE role_permissions IS 'Bảng phân quyền chi tiết cho các role. CHÚ Ý: ADMIN không cần lưu trong bảng này vì có toàn quyền tự động.';

-- Kiểm tra kết quả
SELECT 
  r.role_code,
  r.role_name,
  COUNT(rp.id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
GROUP BY r.id, r.role_code, r.role_name
ORDER BY r.id;

-- Kết quả mong đợi:
-- ADMIN: 0 permissions (toàn quyền tự động)
-- MANAGER: X permissions
-- STAFF: Y permissions
