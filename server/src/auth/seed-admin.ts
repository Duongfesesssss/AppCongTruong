import bcrypt from "bcryptjs";

import { config } from "../lib/config";
import { logger } from "../lib/logger";
import { UserModel } from "../users/user.model";
import { sanitizeText } from "../lib/utils";

export const seedAdminUser = async () => {
  if (!config.adminEmail || !config.adminPassword) {
    logger.warn("Admin credentials not set, skip seed");
    return;
  }

  const exists = await UserModel.findOne({ email: config.adminEmail.toLowerCase() });
  if (exists) return;

  const passwordHash = await bcrypt.hash(config.adminPassword, 10);
  await UserModel.create({
    name: sanitizeText("Admin"),
    email: config.adminEmail.toLowerCase(),
    passwordHash,
    role: "admin"
  });

  logger.info("Seeded admin user");
};
