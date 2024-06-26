import { BadRequestError } from "../expressError.js";

// TODO: tie all the examples together
// TODO: show input => output
/** Given data to update in the database, returns data in a parameterized format
 * for the SET clause in an SQL query
 * Throws a Bad Request error if no data was entered.
 *
 * Input:
 * - dataToUpdate: object, data to be converted to a parameterized SQL query
 * that will have placeholders for variables eg. {firstName: 'Aliya', age: 32}
 * - jsToSql: object, key is JS variable name, value is corresponding database
 * column eg. {numEmployees: "num_employees"}
 *
 * Output:
 * Returns an object with the properties `setCols` that contains a string of the
 * SQL columns to be set with the corresponding placeholders and `values` that
 * contains the corresponding values for the placeholders
 * eg. {
 * setCols: '"first_name"=$1', '"age"=$2',
 * values: ["Aliya", 32]
 * }
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
    `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

export { sqlForPartialUpdate };
