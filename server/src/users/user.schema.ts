import { z } from "zod";

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6)
  })
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự")
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
});

export const refreshSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().optional()
    })
    .optional()
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Tên phải có ít nhất 2 ký tự").optional(),
    bio: z.string().max(500, "Bio không được vượt quá 500 ký tự").optional(),
    phone: z.string().regex(/^[0-9+\-\s()]*$/, "Số điện thoại không hợp lệ").optional(),
    metadata: z.record(z.unknown()).optional()
  })
});
