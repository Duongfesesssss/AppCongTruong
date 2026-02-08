import { z } from "zod";

import { isValidObjectId } from "./utils";

export const objectIdSchema = z
  .string()
  .refine((value) => isValidObjectId(value), "ID khong hop le");
