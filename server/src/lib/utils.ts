import crypto from "node:crypto";

import sanitizeHtml from "sanitize-html";
import mongoose from "mongoose";

export const sanitizeText = (value: string) => {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
};

export const toCode = (value: string, length = 4) => {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cleaned = normalized.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const code = cleaned.slice(0, length);
  return code.length > 0 ? code : "NA";
};

export const formatSequence = (seq: number) => {
  return String(seq).padStart(6, "0");
};

export const formatPinCode = (projectCode: string, buildingCode: string, floorCode: string, gewerkCode: string, seq: number) => {
  return `${projectCode}-${buildingCode}-${floorCode}-${gewerkCode}-${formatSequence(seq)}`;
};

export const hashToken = (value: string) => {
  return crypto.createHash("sha256").update(value).digest("hex");
};

export const isValidObjectId = (value: string) => mongoose.Types.ObjectId.isValid(value);
