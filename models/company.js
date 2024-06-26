import db from "../db.js";
import { BadRequestError, NotFoundError } from "../expressError.js";
import { sqlForPartialUpdate } from "../helpers/sql.js";

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(`
        SELECT handle
        FROM companies
        WHERE handle = $1`, [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(`
                INSERT INTO companies (handle,
                                       name,
                                       description,
                                       num_employees,
                                       logo_url)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING
                    handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"`, [
      handle,
      name,
      description,
      numEmployees,
      logoUrl,
    ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(`
        SELECT handle,
               name,
               description,
               num_employees AS "numEmployees",
               logo_url      AS "logoUrl"
        FROM companies
        ORDER BY name`);
    return companiesRes.rows;
  }

  /** Find all companies matching given filter criteria, an object that can only
   * include minEmployees (an int), maxEmployees (an int) and nameLike (string).
   *
   * Returns array of objects of company data based on filter conditions, e.g.
   * [{ handle, name, description, numEmployees, logoUrl }, ...]
   */
  static async findFiltered(criteria) {

    // COOL: This could be refactored to be part of the findAll method above (only if it's renamed!)

    // COOL: This is a good opp for destructuring from the input criteria
    // This makes the docstring parameters explicit
    const { conds, values } = Company.parameterizeFilterQuery(criteria);

    const companiesRes = await db.query(`
        SELECT handle,
               name,
               description,
               num_employees AS "numEmployees",
               logo_url      AS "logoUrl"
        FROM companies
        WHERE ${conds}
        ORDER BY name`,
      values
    );
    return companiesRes.rows;
  }


  /** Returns conditions and placeholder values for an SQL WHERE clause based on
   * provided filter criteria (object), which can only include minEmployees (an
   * int), maxEmployees (an int), and nameLike (string).
   * eg. { minEmployees: 2, maxEmployees: 3 } => {
   * filterConds: "num_employees >= $1 AND num_employees <= $2",
   * condValues: [2, 3]
   * }
   */
  static parameterizeFilterQuery(criteria) {
    const condsAndValues = {};
    const values = [];
    const conds = [];

    if ("minEmployees" in criteria) {
      conds.push(`num_employees >= $${values.length + 1}`);
      values.push(criteria.minEmployees);
    }

    if ("maxEmployees" in criteria) {
      conds.push(`num_employees <= $${values.length + 1}`);
      values.push(criteria.maxEmployees);
    }

    if ("nameLike" in criteria) {
      conds.push(`name ILIKE $${values.length + 1}`);
      values.push(`%${criteria.nameLike}%`);
    }

    condsAndValues.conds = conds.join(" AND ");
    condsAndValues.values = values;

    return condsAndValues;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(`
        SELECT handle,
               name,
               description,
               num_employees AS "numEmployees",
               logo_url      AS "logoUrl"
        FROM companies
        WHERE handle = $1`, [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        numEmployees: "num_employees",
        logoUrl: "logo_url",
      });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
        UPDATE companies
        SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING
            handle,
            name,
            description,
            num_employees AS "numEmployees",
            logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(`
        DELETE
        FROM companies
        WHERE handle = $1
        RETURNING handle`, [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


export default Company;