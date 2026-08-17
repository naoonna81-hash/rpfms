export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static validation(message = 'ข้อมูลไม่ถูกต้อง', details?: unknown) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }
  static unauthorized(message = 'กรุณาเข้าสู่ระบบ') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'ไม่มีสิทธิ์เข้าถึง') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'ไม่พบข้อมูล') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message = 'ข้อมูลขัดแย้ง') {
    return new ApiError(409, 'CONFLICT', message);
  }
  static rateLimited(message = 'มีการเรียกใช้งานถี่เกินไป') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }
  static internal(message = 'เกิดข้อผิดพลาดภายในระบบ') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}
