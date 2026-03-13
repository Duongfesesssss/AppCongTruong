# Permission Matrix System (RBAC nâng cao)

## Tổng quan

Hệ thống Permission Matrix cho phép Admin cấu hình chi tiết quyền cho từng vai trò (role) trong project. Đây là nâng cấp từ hệ thống role-based đơn giản (admin/technician) sang RBAC (Role-Based Access Control) nâng cao với ma trận quyền có thể tùy chỉnh.

## Vai trò (Roles)

Hệ thống hỗ trợ 7 vai trò chính:

1. **Admin** - Quản trị viên (full quyền)
2. **Quản lý dự án** (quan-ly-du-an) - Quyền quản lý cao
3. **Chủ thầu** (chu-thau) - Quyền quản lý trung bình-cao
4. **Thiết kế** (thiet-ke) - Tập trung vào bản vẽ
5. **Thầu phụ** (thau-phu) - Quyền thực thi
6. **Thợ** (tho) - Quyền thấp, chủ yếu xem
7. **Người quan sát** (nguoi-quan-sat) - Chỉ xem

### Legacy Roles (Backward Compatible)
- **admin** - Tương đương Admin
- **technician** - Kỹ thuật viên (legacy)

## Quyền (Permissions)

### Project Permissions
- `project.view` - Xem thông tin công trình
- `project.create` - Tạo công trình mới
- `project.update_info` - Nhập/sửa thông tin công trình
- `project.manage_members` - Thêm/xóa thành viên
- `project.manage_roles` - Phân quyền thành viên
- `project.manage_permissions` - Quản lý ma trận quyền (chỉ Admin)

### Drawings Permissions
- `drawings.view` - Xem bản vẽ
- `drawings.upload` - Upload bản vẽ
- `drawings.download` - Tải xuống bản vẽ
- `drawings.filter` - Lọc bản vẽ
- `drawings.manage` - Quản lý bản vẽ (đổi tên, xóa)

### Tasks Permissions
- `tasks.view` - Xem Task/Pin
- `tasks.create` - Tạo Task/Pin
- `tasks.comment` - Bình luận Task
- `tasks.manage` - Quản lý Task (sửa, xóa, di chuyển)
- `tasks.attachments.upload_multi` - Upload nhiều ảnh

## Kiến trúc Backend

### 1. Permission Constants (`server/src/permissions/permission-constants.ts`)
```typescript
// Định nghĩa roles, permissions, default matrix
export const projectRoles = [...];
export const permissionKeys = [...];
export const defaultPermissionMatrix = {...};
```

### 2. Permission Helpers (`server/src/permissions/permission-helpers.ts`)
```typescript
// Core permission logic
export const hasPermission(project, userId, permissionKey): boolean
export const ensurePermission(project, userId, permissionKey): void
export const getUserPermissions(project, userId): Record<PermissionKey, boolean>
```

### 3. Permission API (`server/src/permissions/index.ts`)
```typescript
GET    /api/projects/:id/permissions        // Lấy permission matrix
PUT    /api/projects/:id/permissions        // Cập nhật matrix (Admin only)
POST   /api/projects/:id/permissions/reset  // Reset về default
GET    /api/projects/:id/permissions/logs   // Xem audit log
```

### 4. Enhanced Project Access (`server/src/projects/project-access.ts`)
```typescript
// Legacy (backward compatible)
export const ensureProjectRole(project, userId, minRole)

// New permission-based
export const ensureProjectPermission(project, userId, permission)
export const checkProjectPermission(project, userId, permission): boolean
export const getProjectPermissions(project, userId)
```

## Data Model

### ProjectDocument Extension
```typescript
type ProjectDocument = {
  // ... existing fields
  permissionMatrix?: {
    roles: Record<string, Record<string, boolean>>
  }
  permissionChangeLogs?: PermissionChangeLog[]
}
```

### Permission Change Log
```typescript
type PermissionChangeLog = {
  changedBy: ObjectId
  changedAt: Date
  action: "matrix_updated" | "matrix_reset"
  changes: Array<{
    role: string
    permission: string
    oldValue: boolean
    newValue: boolean
  }>
}
```

## Frontend (UI)

### Permission Settings Modal (`client/components/PermissionSettingsModal.vue`)

**Features:**
- Dropdown chọn role
- Danh sách permissions có checkbox, grouped by category
- Hiển thị mô tả cho từng quyền
- Admin-only editing (non-admin chỉ xem)
- Save/Reset functionality
- Warning khi có thay đổi chưa lưu

**Integration:**
- Tích hợp trong `AppSidebar.vue`
- Button "Cài đặt quyền" (chỉ Admin thấy)
- Auto-refresh project tree sau khi update

## Usage Examples

### Backend - Check Permission
```typescript
import { ensureProjectPermission } from "../projects/project-access";

// Trong API endpoint
router.post("/drawings/:id/upload", requireAuth, async (req, res) => {
  const project = await ProjectModel.findById(projectId);
  ensureProjectPermission(project, req.user!.id, "drawings.upload");
  // ... upload logic
});
```

### Backend - Get User Permissions
```typescript
import { getProjectPermissions } from "../projects/project-access";

const permissions = getProjectPermissions(project, userId);
// Returns: { "project.view": true, "drawings.upload": false, ... }
```

### Frontend - Check Permission in Component
```typescript
const project = await api.get(`/projects/${projectId}`);
const canUpload = project.permissions["drawings.upload"];

if (canUpload) {
  // Show upload button
}
```

## Migration Strategy

### Phase 1: Backward Compatible (Current)
- Legacy `ensureProjectRole` vẫn hoạt động
- Project response includes both legacy permissions và new permission matrix
- Existing code không cần sửa

### Phase 2: Gradual Migration (Future)
- Từng module chuyển sang dùng `ensureProjectPermission`
- Frontend dùng permission keys thay vì role checks

### Phase 3: Full Permission-Based (Future)
- Deprecated legacy role checks
- Full RBAC với permission matrix

## Default Permission Matrix

| Permission | Admin | PM | Chủ thầu | Thiết kế | Thầu phụ | Thợ | Quan sát |
|-----------|-------|-------|----------|----------|----------|-----|----------|
| project.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| project.manage_permissions | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| drawings.upload | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| drawings.download | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| tasks.create | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| tasks.manage | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |

*(Xem đầy đủ trong `permission-constants.ts`)*

## Security Considerations

1. **Admin-Only Matrix Management**
   - Chỉ Admin mới có quyền `project.manage_permissions`
   - Validation đầy đủ trên server

2. **Audit Log**
   - Mọi thay đổi permission matrix đều được log
   - Lưu: ai thay đổi, thay đổi gì, khi nào
   - Giới hạn 100 logs gần nhất

3. **Backward Compatibility**
   - Legacy role checks vẫn hoạt động
   - Không breaking changes

4. **Default Matrix**
   - Project mới tự động có default permission matrix
   - Admin luôn có full quyền

## Testing

### API Testing
```bash
# Get permissions
GET /api/projects/:id/permissions

# Update permissions (Admin only)
PUT /api/projects/:id/permissions
{
  "permissionMatrix": {
    "roles": {
      "admin": { "project.view": true, ... },
      ...
    }
  }
}

# Reset to default
POST /api/projects/:id/permissions/reset

# View audit logs
GET /api/projects/:id/permissions/logs?limit=20
```

### UI Testing
1. Login as Admin
2. Select a project
3. Click "Cài đặt quyền" button
4. Select different roles from dropdown
5. Toggle permissions
6. Click "Lưu thay đổi"
7. Verify permissions are saved
8. Test "Reset về mặc định"

## Future Enhancements

1. **Custom Roles**
   - Cho phép tạo role mới
   - Custom permission sets

2. **Resource-Level Permissions**
   - Permissions theo từng drawing/task cụ thể
   - Row-level security

3. **Permission Groups**
   - Nhóm permissions thành presets
   - Quick assignment

4. **Time-Based Permissions**
   - Temporary permissions
   - Expiration dates

## Troubleshooting

### Permission Matrix không hiển thị
- Kiểm tra user có phải Admin không
- Check API endpoint `/api/projects/:id/permissions`
- Xem console logs

### Thay đổi không được lưu
- Verify user role là "admin"
- Check network tab cho errors
- Xem server logs

### Backward compatibility issues
- Legacy endpoints vẫn dùng `ensureProjectRole`
- New endpoints nên dùng `ensureProjectPermission`
- Cả hai đều supported

## Contact & Support

Hệ thống được implement theo issue: **Implement Permission Matrix (Override Permission) theo Project + UI tick/untick cho Admin (RBAC nâng cao)**

Xem thêm:
- `server/src/permissions/` - Backend permission logic
- `client/components/PermissionSettingsModal.vue` - UI component
- `server/src/projects/project-access.ts` - Enhanced access control
