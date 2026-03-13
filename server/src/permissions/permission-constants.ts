/**
 * Permission constants và default matrix cho RBAC system
 * Dựa trên requirements trong issue về Permission Matrix
 */

// Định nghĩa các roles trong hệ thống
export const projectRoles = [
  "admin",
  "quan-ly-du-an", // Quản lý dự án
  "chu-thau", // Chủ thầu
  "thiet-ke", // Thiết kế
  "thau-phu", // Thầu phụ
  "tho", // Thợ
  "nguoi-quan-sat" // Người quan sát
] as const;

export type ProjectRole = (typeof projectRoles)[number];

// Định nghĩa các permissions trong hệ thống
export const permissionKeys = [
  // Project permissions
  "project.view",
  "project.create",
  "project.update_info",
  "project.manage_members",
  "project.manage_roles",
  "project.manage_permissions", // Admin-only

  // Drawings permissions
  "drawings.view",
  "drawings.upload",
  "drawings.download",
  "drawings.filter",
  "drawings.manage",

  // Tasks permissions
  "tasks.view",
  "tasks.create",
  "tasks.comment",
  "tasks.manage",
  "tasks.attachments.upload_multi"
] as const;

export type PermissionKey = (typeof permissionKeys)[number];

// Permission metadata với mô tả tiếng Việt
export const permissionMetadata: Record<PermissionKey, { label: string; description: string; category: string }> = {
  // Project
  "project.view": {
    label: "Xem thông tin công trình",
    description: "Cho phép xem thông tin cơ bản của công trình",
    category: "Công trình"
  },
  "project.create": {
    label: "Tạo công trình mới",
    description: "Cho phép tạo công trình mới",
    category: "Công trình"
  },
  "project.update_info": {
    label: "Nhập/sửa thông tin công trình",
    description: "Cho phép cập nhật tên, mô tả, metadata của công trình",
    category: "Công trình"
  },
  "project.manage_members": {
    label: "Thêm thành viên",
    description: "Cho phép thêm/xóa thành viên vào công trình",
    category: "Công trình"
  },
  "project.manage_roles": {
    label: "Phân quyền thành viên",
    description: "Cho phép thay đổi vai trò của thành viên",
    category: "Công trình"
  },
  "project.manage_permissions": {
    label: "Quản lý ma trận quyền",
    description: "Cho phép chỉnh sửa ma trận quyền (chỉ Admin)",
    category: "Công trình"
  },

  // Drawings
  "drawings.view": {
    label: "Xem bản vẽ",
    description: "Cho phép xem danh sách và nội dung bản vẽ",
    category: "Bản vẽ"
  },
  "drawings.upload": {
    label: "Upload bản vẽ",
    description: "Cho phép tải lên bản vẽ mới",
    category: "Bản vẽ"
  },
  "drawings.download": {
    label: "Tải xuống bản vẽ",
    description: "Cho phép tải xuống file bản vẽ",
    category: "Bản vẽ"
  },
  "drawings.filter": {
    label: "Lọc bản vẽ",
    description: "Cho phép lọc theo tầng/bộ môn/giai đoạn/đa lớp",
    category: "Bản vẽ"
  },
  "drawings.manage": {
    label: "Quản lý bản vẽ",
    description: "Cho phép đổi tên, sửa metadata, xóa bản vẽ",
    category: "Bản vẽ"
  },

  // Tasks
  "tasks.view": {
    label: "Xem Task/Pin",
    description: "Cho phép xem danh sách và chi tiết task",
    category: "Task/Pin"
  },
  "tasks.create": {
    label: "Tạo Task/Pin",
    description: "Cho phép tạo task/pin mới",
    category: "Task/Pin"
  },
  "tasks.comment": {
    label: "Bình luận Task",
    description: "Cho phép thêm bình luận vào task",
    category: "Task/Pin"
  },
  "tasks.manage": {
    label: "Quản lý Task",
    description: "Cho phép sửa status/type/assign, di chuyển, xóa task",
    category: "Task/Pin"
  },
  "tasks.attachments.upload_multi": {
    label: "Upload nhiều ảnh",
    description: "Cho phép upload nhiều ảnh cùng lúc vào task",
    category: "Task/Pin"
  }
};

// Default permission matrix dựa trên requirements
// true = có quyền, false = không có quyền
export const defaultPermissionMatrix: Record<ProjectRole, Record<PermissionKey, boolean>> = {
  admin: {
    // Admin có tất cả quyền
    "project.view": true,
    "project.create": true,
    "project.update_info": true,
    "project.manage_members": true,
    "project.manage_roles": true,
    "project.manage_permissions": true,
    "drawings.view": true,
    "drawings.upload": true,
    "drawings.download": true,
    "drawings.filter": true,
    "drawings.manage": true,
    "tasks.view": true,
    "tasks.create": true,
    "tasks.comment": true,
    "tasks.manage": true,
    "tasks.attachments.upload_multi": true
  },
  "quan-ly-du-an": {
    // Quản lý dự án - gần như full quyền trừ manage_permissions
    "project.view": true,
    "project.create": true,
    "project.update_info": true,
    "project.manage_members": true,
    "project.manage_roles": true,
    "project.manage_permissions": false,
    "drawings.view": true,
    "drawings.upload": true,
    "drawings.download": true,
    "drawings.filter": true,
    "drawings.manage": true,
    "tasks.view": true,
    "tasks.create": true,
    "tasks.comment": true,
    "tasks.manage": true,
    "tasks.attachments.upload_multi": true
  },
  "chu-thau": {
    // Chủ thầu - quyền cao, có thể manage drawings và tasks
    "project.view": true,
    "project.create": false,
    "project.update_info": true,
    "project.manage_members": false,
    "project.manage_roles": false,
    "project.manage_permissions": false,
    "drawings.view": true,
    "drawings.upload": true,
    "drawings.download": true,
    "drawings.filter": true,
    "drawings.manage": true,
    "tasks.view": true,
    "tasks.create": true,
    "tasks.comment": true,
    "tasks.manage": true,
    "tasks.attachments.upload_multi": true
  },
  "thiet-ke": {
    // Thiết kế - tập trung vào drawings
    "project.view": true,
    "project.create": false,
    "project.update_info": false,
    "project.manage_members": false,
    "project.manage_roles": false,
    "project.manage_permissions": false,
    "drawings.view": true,
    "drawings.upload": true,
    "drawings.download": true,
    "drawings.filter": true,
    "drawings.manage": true,
    "tasks.view": true,
    "tasks.create": true,
    "tasks.comment": true,
    "tasks.manage": false,
    "tasks.attachments.upload_multi": true
  },
  "thau-phu": {
    // Thầu phụ - quyền trung bình
    "project.view": true,
    "project.create": false,
    "project.update_info": false,
    "project.manage_members": false,
    "project.manage_roles": false,
    "project.manage_permissions": false,
    "drawings.view": true,
    "drawings.upload": false,
    "drawings.download": true,
    "drawings.filter": true,
    "drawings.manage": false,
    "tasks.view": true,
    "tasks.create": true,
    "tasks.comment": true,
    "tasks.manage": false,
    "tasks.attachments.upload_multi": true
  },
  tho: {
    // Thợ - quyền thấp, chủ yếu xem và comment
    "project.view": true,
    "project.create": false,
    "project.update_info": false,
    "project.manage_members": false,
    "project.manage_roles": false,
    "project.manage_permissions": false,
    "drawings.view": true,
    "drawings.upload": false,
    "drawings.download": true,
    "drawings.filter": true,
    "drawings.manage": false,
    "tasks.view": true,
    "tasks.create": false,
    "tasks.comment": true,
    "tasks.manage": false,
    "tasks.attachments.upload_multi": false
  },
  "nguoi-quan-sat": {
    // Người quan sát - chỉ xem
    "project.view": true,
    "project.create": false,
    "project.update_info": false,
    "project.manage_members": false,
    "project.manage_roles": false,
    "project.manage_permissions": false,
    "drawings.view": true,
    "drawings.upload": false,
    "drawings.download": true,
    "drawings.filter": true,
    "drawings.manage": false,
    "tasks.view": true,
    "tasks.create": false,
    "tasks.comment": true,
    "tasks.manage": false,
    "tasks.attachments.upload_multi": false
  }
};

// Helper để get default permissions cho một role
export const getDefaultPermissions = (role: ProjectRole): Record<PermissionKey, boolean> => {
  return { ...defaultPermissionMatrix[role] };
};

// Helper để check xem một permission key có hợp lệ không
export const isValidPermissionKey = (key: string): key is PermissionKey => {
  return permissionKeys.includes(key as PermissionKey);
};

// Helper để check xem một role có hợp lệ không
export const isValidProjectRole = (role: string): role is ProjectRole => {
  return projectRoles.includes(role as ProjectRole);
};
