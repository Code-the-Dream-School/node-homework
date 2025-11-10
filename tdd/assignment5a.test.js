const { Client } = require("pg");
const readline = require("readline");
const fs = require("fs").promises;

require("dotenv").config();
let client = null;
let connected_to_database = false;
let connected_to_homework_file = false;
let transaction_open = false;
const lines = [];

const one_sql_line = () => {
  let statement = "";

  while (lines.length > 0) {
    const line = lines.shift().trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    statement += " " + line;
    if (line.endsWith(";")) break; // If a semicolon is found, the statement is complete
  }
  return statement.trim() || undefined;
};

function parameterizeOrderId(sql) {
  // Extract column names and value tuples
  const columnsMatch = sql.match(/\(\s*([^)]+?)\s*\)\s*VALUES/i);
  if (!columnsMatch) return sql;

  const columns = columnsMatch[1].split(/\s*,\s*/);
  const orderIdIndex = columns.findIndex(
    (col) => col.toLowerCase() === "order_id",
  );
  if (orderIdIndex === -1) return sql; // No order_id column found

  // Replace values
  return sql.replace(/\(([^)]+)\)/g, (match, group) => {
    const values = group.split(/\s*,\s*/);
    if (values.length <= orderIdIndex) return match;

    const value = values[orderIdIndex];
    const numericValue = parseInt(value, 10);

    if (!isNaN(numericValue) && numericValue > 230) {
      values[orderIdIndex] = "$1";
      return `(${values.join(", ")})`;
    }

    return match;
  });
}

beforeAll(async () => {
  client = new Client({ connectionString: process.env.DB_URL });
  try {
    await client.connect();
    connected_to_database = true;
    client.on;
  } catch (error) {
    // This is a mystery error, assumed to be not recoverable
    console.log("error connecting to database");
    console.log(
      `An error occurred: ${error.name} ${error.message} ${error.stack}`,
    );
  }
  if (connected_to_database) {
    try {
      const homework_fd = await fs.open("./assignment5/assignment5-sql.txt");
      const homework_stream = homework_fd.createReadStream();
      const rl = readline.createInterface({
        input: homework_stream,
        crlfDelay: Infinity, // Handle all line endings consistently
      });
      for await (const line of rl) {
        lines.push(line);
      }
      rl.close();
      homework_stream.close();
      await homework_fd.close();
      connected_to_homework_file = true;
    } catch (error) {
      console.log("error connecting to homework file.");
      console.log(error);
    }
  }
});

afterAll(async () => {
  if (transaction_open) {
    await client.query("ROLLBACK;");
  }
  client.end();
});

test("Total price of the first 5 orders", async () => {
  expect(connected_to_database).toBe(true);
  expect(connected_to_homework_file).toBe(true);
  const sql_line = one_sql_line();
  expect(sql_line).not.toBe(undefined);
  let result = await client.query(sql_line);
  expect(result.rows.length).toBe(5);
  expect(result.rows[0]).toHaveProperty("order_id");
  expect(result.rows[0].order_id).toBe(1);
  expect(result.rows[0]).toHaveProperty("total_price");
  expect(Math.floor(result.rows[0].total_price)).toBe(513);
});

test("Average total order price for each customer", async () => {
  expect(connected_to_database).toBe(true);
  expect(connected_to_homework_file).toBe(true);
  const sql_line = one_sql_line();
  expect(sql_line).not.toBe(undefined);
  let result = await client.query(sql_line);
  expect(result.rows.length).toBeGreaterThan(20);
  expect(result.rows[0]).toHaveProperty("customer_name");
  expect(result.rows[0].customer_name).toBe("Anderson and Sons");
  expect(result.rows[0]).toHaveProperty("average_order_price");
  expect(Math.floor(result.rows[0].average_order_price)).toBe(234);
});

test("creating a new order", async () => {
  expect(connected_to_database).toBe(true);
  expect(connected_to_homework_file).toBe(true);
  let sql_line = one_sql_line();
  expect(sql_line).not.toBe(undefined);
  let result = await client.query(sql_line);
  expect(result.rows[0]).toHaveProperty("customer_id");
  expect(result.rows[0].customer_id).toBe(16);
  sql_line = one_sql_line();
  expect(sql_line).not.toBe(undefined);
  result = await client.query(sql_line);
  expect(result.rows[0]).toHaveProperty("employee_id");
  expect(result.rows[0].employee_id).toBe(7);
  sql_line = one_sql_line();
  expect(sql_line).not.toBe(undefined);
  result = await client.query(sql_line);
  expect(result.rows.length).toBe(5);
  expect(result.rows[0]).toHaveProperty("product_id");
  expect(result.rows[0].product_id).toBe(23);
  sql_line = one_sql_line();
  expect(sql_line).not.toBe(undefined);
  expect(sql_line).toBe("BEGIN;");
  result = await client.query(sql_line);
  transaction_open = true;
  sql_line = one_sql_line();
  expect(sql_line).not.toBe(undefined);
  expect(sql_line.indexOf("INSERT ")).toBe(0);
  result = await client.query(sql_line);
  expect(result.rows[0]).toHaveProperty("order_id");
  const order_id = result.rows[0].order_id;
  sql_line = one_sql_line();
  expect(sql_line).not.toBe(undefined);
  expect(sql_line.indexOf("INSERT ")).toBe(0);
  let parameterized = parameterizeOrderId(sql_line);
  result = await client.query(parameterized, [order_id]);
  sql_line = one_sql_line();
  expect(sql_line).not.toBe(undefined);
  expect(sql_line).toBe("COMMIT;");
  await client.query(sql_line);
  transaction_open = false;
  sql_line = one_sql_line();
  expect(sql_line).not.toBe(undefined);
  const order_id_index = sql_line.indexOf("order_id");
  expect(sql_line.indexOf("order_id")).toBeGreaterThan(10);
  parameterized = sql_line.substring(0, order_id_index) + "order_id = $1;";
  result = await client.query(parameterized, [order_id]);
  expect(result.rows.length).toBe(5);
  expect(result.rows[0]).toHaveProperty("line_item_id");
});

test("use HAVING to find employees with > 5 orders", async () => {
  expect(connected_to_database).toBe(true);
  expect(connected_to_homework_file).toBe(true);
  let sql_line = one_sql_line();
  expect(sql_line).not.toBe(undefined);
  let result = await client.query(sql_line);
  console.log(sql_line);
  expect(result.rows.length).toBeGreaterThan(12);
  expect(result.rows[0]).toHaveProperty("order_count");
  expect(result.rows[0]).toHaveProperty("last_name");
  expect(result.rows[0].last_name).toBe("Bowman");
});
