/** Routes for companies. */

import jsonschema from "jsonschema";
import { Router } from "express";

import { BadRequestError } from "../expressError.js";
import { ensureLoggedIn, ensureIsAdmin } from "../middleware/auth.js";
import Company from "../models/company.js";
import compFilterSchema from "../schemas/compFilter.json" with { type: "json" };
import compNewSchema from "../schemas/compNew.json" with { type: "json" };
import compUpdateSchema from "../schemas/compUpdate.json" with { type: "json" };

const router = new Router();

/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: login and admin
 */

router.post("/", ensureIsAdmin, async function (req, res) {
  const validator = jsonschema.validate(
    req.body,
    compNewSchema,
    { required: true },
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const company = await Company.create(req.body);
  return res.status(201).json({ company });
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  if (Object.keys(req.query).length === 0) {
    const companies = await Company.findAll();
    return res.json({ companies });
  }

  // COOL: Solution has some sweet syntactic sugar for this one!
  // set criteria equal to req.query
  // check if minEmployees in criteria, if so cast as Number
  // same for maxEmployees

  const criteria = {};
  for (const key in req.query) {
    if (key === "minEmployees") {
      criteria[key] = Number(req.query[key]);
    }
    else if (key === "maxEmployees") {
      criteria[key] = Number(req.query[key]);
    }
    else {
      criteria[key] = req.query[key];
    }
  }

  const validator = jsonschema.validate(
    criteria,
    compFilterSchema,
    { required: true },
  );
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  // NOTE: You could make an argument that this check could live in Models
  if (criteria.minEmployees > criteria.maxEmployees) {
    throw new BadRequestError("Min can't be greater than max.");
  }

  const companies = await Company.findFiltered(criteria);
  return res.json({ companies });
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
  const company = await Company.get(req.params.handle);
  return res.json({ company });
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: login and admin
 */

router
  .patch("/:handle", ensureIsAdmin, async function (req, res) {
    const validator = jsonschema.validate(
      req.body,
      compUpdateSchema,
      { required: true },
    );
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.update(req.params.handle, req.body);
    return res.json({ company });
  });

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: login and admin
 */

router
  .delete("/:handle", ensureIsAdmin, async function (req, res) {
    await Company.remove(req.params.handle);
    return res.json({ deleted: req.params.handle });
  });


export default router;
