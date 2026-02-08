export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  status: number;
  code: ErrorCode;
  details?: Record<string, unknown>;

  constructor(message: string, status: number, code: ErrorCode, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const errors = {
  validation: (message: string, details?: Record<string, unknown>) =>
    new AppError(message, 400, "VALIDATION_ERROR", details),
  unauthorized: (message = "Chưa đăng nhập") => new AppError(message, 401, "UNAUTHORIZED"),
  forbidden: (message = "Không có quyền") => new AppError(message, 403, "FORBIDDEN"),
  notFound: (message = "Không tồn tại") => new AppError(message, 404, "NOT_FOUND"),
  conflict: (message = "Trùng dữ liệu") => new AppError(message, 409, "CONFLICT"),
  internal: (message = "Lỗi server") => new AppError(message, 500, "INTERNAL_ERROR")
};
