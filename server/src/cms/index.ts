import { Router } from "express";

import { asyncHandler, sendSuccess } from "../lib/response";
import { validate } from "../middlewares/validation";
import { requireAuth } from "../middlewares/require-auth";
import { errors } from "../lib/errors";
import { sanitizeText } from "../lib/utils";
import { CmsTagNameModel } from "./cms-tag-name.model";
import { CmsEntryModel } from "./cms-entry.model";
import { ensureDefaultCmsTagNames, getDefaultCmsTagSeedCount } from "./default-tag-seed";
import {
  cmsEntryIdSchema,
  cmsTagNameIdSchema,
  createCmsEntrySchema,
  createCmsTagNameSchema,
  listCmsEntrySchema,
  listCmsTagNameSchema,
  updateCmsEntrySchema,
  updateCmsTagNameSchema
} from "./cms.schema";

const router = Router();

const normalizeCode = (value: string) => {
  return sanitizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9._-]+/g, "")
    .replace(/^-+|-+$/g, "");
};

const normalizeTagName = (value: string) => {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9.:-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const uniqueValues = (values: string[]) => {
  return Array.from(new Set(values.filter(Boolean)));
};

const splitCodeTokens = (value: string) => {
  return uniqueValues(
    value
      .split(/[\/, _-]+/)
      .map((token) => normalizeCode(token))
      .filter(Boolean)
  );
};

const sanitizeAliases = (values: string[] | undefined) => {
  return uniqueValues(
    (values || [])
      .flatMap((value) => splitCodeTokens(value))
      .map((value) => normalizeCode(value))
      .filter(Boolean)
  );
};

const sanitizeTagNames = (values: string[] | undefined) => {
  return uniqueValues(
    (values || [])
      .map((value) => normalizeTagName(value))
      .filter(Boolean)
  );
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get(
  "/tag-names",
  requireAuth,
  validate(listCmsTagNameSchema),
  asyncHandler(async (req, res) => {
    await ensureDefaultCmsTagNames(req.user?.id);

    const filter: Record<string, unknown> = {};
    if (req.query.scope) {
      filter.scope = String(req.query.scope);
    }
    if (typeof req.query.active === "boolean") {
      filter.isActive = req.query.active;
    }
    if (req.query.q) {
      const q = sanitizeText(String(req.query.q));
      if (q) {
        const pattern = new RegExp(escapeRegExp(q), "i");
        filter.$or = [{ code: pattern }, { aliases: pattern }, { label: pattern }, { description: pattern }];
      }
    }

    const tagNames = await CmsTagNameModel.find(filter).sort({ scope: 1, code: 1, createdAt: -1 });
    return sendSuccess(res, tagNames);
  })
);

router.post(
  "/tag-names/bootstrap",
  requireAuth,
  asyncHandler(async (req, res) => {
    await ensureDefaultCmsTagNames(req.user?.id);
    return sendSuccess(res, {
      ok: true,
      totalSeedItems: getDefaultCmsTagSeedCount()
    });
  })
);

router.post(
  "/tag-names",
  requireAuth,
  validate(createCmsTagNameSchema),
  asyncHandler(async (req, res) => {
    const { scope, code, aliases, label, description, isActive } = req.body as {
      scope?: string;
      code: string;
      aliases?: string[];
      label: string;
      description?: string;
      isActive?: boolean;
    };

    const codeTokens = splitCodeTokens(code);
    const primaryCode = normalizeCode(codeTokens[0] || code);
    if (!primaryCode) throw errors.validation("Code khong hop le");

    const mergedAliases = sanitizeAliases([...(aliases || []), ...codeTokens.slice(1)]).filter(
      (alias) => alias !== primaryCode
    );

    const tagName = await CmsTagNameModel.create({
      scope: scope || "custom",
      code: primaryCode,
      aliases: mergedAliases,
      label: sanitizeText(label),
      description: description ? sanitizeText(description) : undefined,
      isActive: isActive ?? true,
      createdBy: req.user?.id,
      updatedBy: req.user?.id
    });

    return sendSuccess(res, tagName, {}, 201);
  })
);

router.patch(
  "/tag-names/:id",
  requireAuth,
  validate(updateCmsTagNameSchema),
  asyncHandler(async (req, res) => {
    const tagName = await CmsTagNameModel.findById(req.params.id);
    if (!tagName) throw errors.notFound("Tag name khong ton tai");

    const { scope, code, aliases, label, description, isActive } = req.body as {
      scope?: string;
      code?: string;
      aliases?: string[];
      label?: string;
      description?: string;
      isActive?: boolean;
    };

    if (scope !== undefined) tagName.scope = scope as typeof tagName.scope;
    if (code !== undefined) {
      const codeTokens = splitCodeTokens(code);
      const primaryCode = normalizeCode(codeTokens[0] || code);
      if (!primaryCode) throw errors.validation("Code khong hop le");
      tagName.code = primaryCode;
      const mergedAliases = sanitizeAliases([...(aliases || []), ...codeTokens.slice(1)]).filter(
        (alias) => alias !== primaryCode
      );
      tagName.aliases = mergedAliases;
    } else if (aliases !== undefined) {
      tagName.aliases = sanitizeAliases(aliases).filter((alias) => alias !== tagName.code);
    }
    if (label !== undefined) tagName.label = sanitizeText(label);
    if (description !== undefined) tagName.description = sanitizeText(description);
    if (isActive !== undefined) tagName.isActive = isActive;
    tagName.updatedBy = req.user?.id;

    await tagName.save();
    return sendSuccess(res, tagName);
  })
);

router.delete(
  "/tag-names/:id",
  requireAuth,
  validate(cmsTagNameIdSchema),
  asyncHandler(async (req, res) => {
    const tagName = await CmsTagNameModel.findById(req.params.id);
    if (!tagName) throw errors.notFound("Tag name khong ton tai");

    await CmsTagNameModel.deleteOne({ _id: req.params.id });
    return sendSuccess(res, { ok: true });
  })
);

router.get(
  "/entries",
  requireAuth,
  validate(listCmsEntrySchema),
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.tagName) filter.tagNames = normalizeTagName(String(req.query.tagName));
    if (req.query.q) {
      const q = sanitizeText(String(req.query.q));
      if (q) {
        const pattern = new RegExp(escapeRegExp(q), "i");
        filter.$or = [{ title: pattern }, { content: pattern }];
      }
    }

    const [items, total] = await Promise.all([
      CmsEntryModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CmsEntryModel.countDocuments(filter)
    ]);

    return sendSuccess(res, items, {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  })
);

router.post(
  "/entries",
  requireAuth,
  validate(createCmsEntrySchema),
  asyncHandler(async (req, res) => {
    const { title, content, status, tagNames } = req.body as {
      title: string;
      content: string;
      status?: "draft" | "published";
      tagNames?: string[];
    };

    const entry = await CmsEntryModel.create({
      title: sanitizeText(title),
      content: sanitizeText(content),
      status: status || "draft",
      tagNames: sanitizeTagNames(tagNames),
      createdBy: req.user?.id,
      updatedBy: req.user?.id
    });

    return sendSuccess(res, entry, {}, 201);
  })
);

router.patch(
  "/entries/:id",
  requireAuth,
  validate(updateCmsEntrySchema),
  asyncHandler(async (req, res) => {
    const entry = await CmsEntryModel.findById(req.params.id);
    if (!entry) throw errors.notFound("CMS entry khong ton tai");

    const { title, content, status, tagNames } = req.body as {
      title?: string;
      content?: string;
      status?: "draft" | "published";
      tagNames?: string[];
    };

    if (title !== undefined) entry.title = sanitizeText(title);
    if (content !== undefined) entry.content = sanitizeText(content);
    if (status !== undefined) entry.status = status;
    if (tagNames !== undefined) entry.tagNames = sanitizeTagNames(tagNames);
    entry.updatedBy = req.user?.id;

    await entry.save();
    return sendSuccess(res, entry);
  })
);

router.delete(
  "/entries/:id",
  requireAuth,
  validate(cmsEntryIdSchema),
  asyncHandler(async (req, res) => {
    const entry = await CmsEntryModel.findById(req.params.id);
    if (!entry) throw errors.notFound("CMS entry khong ton tai");

    await CmsEntryModel.deleteOne({ _id: req.params.id });
    return sendSuccess(res, { ok: true });
  })
);

export default router;
