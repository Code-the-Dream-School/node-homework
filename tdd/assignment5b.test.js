require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const pool = require("../db/pg-pool");
const httpMocks = require("node-mocks-http");
const {
  index,
  show,
  create,
  update,
  deleteTask,
} = require("../controllers/taskController");
const { logon, register, logoff } = require("../controllers/userController");

let user1 = null;
let user2 = null;
let saveRes = null;
let saveData = null;
let saveTaskId = null;

describe("test that database and tables exist", () => {
  it("connects to database", async () => {
    let databaseExists = true;
    try {
      await pool.query("SELECT 1;");
    } catch (err) {
      console.log("Error: the test database hasn't been created.");
      databaseExists = false;
    }
    expect(databaseExists).toBe(true);
  });
  it("clears the tasks table", async () => {
    expect(async () => await pool.query("DELETE FROM tasks;")).not.toThrow();
  });
  it("clears the users table", async () => {
    expect(async () => await pool.query("DELETE FROM users;")).not.toThrow();
  });
});

afterAll(async () => {
  await pool.end();
});

describe("testing logon, register, and logoff", () => {
  it("You can register a user.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        email: "jim@sample.com",
        name: "Jim",
        password: "Pa$$word20",
      },
    });
    saveRes = httpMocks.createResponse();
    await register(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(201);
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      "jim@sample.com",
    ]);
    user1 = result.rows[0].id;
  });

  it("The user can be logged on", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "jim@sample.com", password: "Pa$$word20" },
    });
    saveRes = httpMocks.createResponse();
    await logon(req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("returns the expected name.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.name).toBe("Jim");
  });

  it("A logon attempt with a bad password returns a 401", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "jim@sample.com", password: "bad password" },
    });
    saveRes = httpMocks.createResponse();
    await logon(req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });
  it("You can't register again with the same email.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        email: "jim@sample.com",
        name: "Jim",
        password: "Pa$$word20",
      },
    });
    saveRes = httpMocks.createResponse();
    await register(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(400);
  });

  it("You can register an additional user.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        email: "manuel@sample.com",
        name: "Manuel",
        password: "Pa$$word20",
      },
    });
    saveRes = httpMocks.createResponse();
    await register(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(201);

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      "manuel@sample.com",
    ]);
    user2 = result.rows[0].id;
  });

  it("You can logon as that new user.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "manuel@sample.com", password: "Pa$$word20" },
    });
    saveRes = httpMocks.createResponse();
    await logon(req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("You can now logoff.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });
    saveRes = httpMocks.createResponse();
    await logoff(req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
});

describe("testing task creation", () => {
  it("Logon before testing tasks", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "jim@sample.com", password: "Pa$$word20" },
    });
    saveRes = httpMocks.createResponse();
    await logon(req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("If you have a valid user id, create() succeeds (res.statusCode should be 201).", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    global.user_id = user1;
    saveRes = httpMocks.createResponse();
    await create(req, saveRes);
    expect(saveRes.statusCode).toBe(201);
  });
  it("The object returned from the create() call has the expected title.", () => {
    saveData = saveRes._getJSONData();
    saveTaskId = saveData.id.toString();
    expect(saveData.title).toBe("first task");
  });
  it("The object has the right value for isCompleted.", () => {
    expect(saveData.is_completed).toBe(false);
  });
});

describe("getting created tasks", () => {
  it("If you use user1's id, index returns a 200 statusCode.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    global.user_id = user1;
    saveRes = httpMocks.createResponse();
    await index(req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("The returned JSON array has length 1.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData).toHaveLength(1);
  });

  it("The title in the first array object is as expected.", () => {
    expect(saveData[0].title).toBe("first task");
  });

  it("If get the list of tasks using the userId from user2, you get a 404.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    global.user_id = user2;
    saveRes = httpMocks.createResponse();
    await index(req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
  it("You can retrieve the first array object using the `show()` method of the controller.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    global.user_id = user1;
    req.params = { id: saveTaskId };
    saveRes = httpMocks.createResponse();
    await show(req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
});

describe("testing the update and delete of tasks.", () => {
  it("User1 can set the task to isCompleted: true.", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
    });
    global.user_id = user1;
    req.params = { id: saveTaskId };
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse();
    await update(req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("User2 can't do this.", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
    });
    global.user_id = user2;
    req.params = { id: saveTaskId };
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse();
    await update(req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
  it("User2 can't delete this task.", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
    });
    global.user_id = user2;
    req.params = { id: saveTaskId };
    saveRes = httpMocks.createResponse();
    await deleteTask(req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
  it("User1 can delete this task.", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
    });
    global.user_id = user1;
    req.params = { id: saveTaskId };
    saveRes = httpMocks.createResponse();
    await deleteTask(req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("Retrieving user1's tasks now returns a 404.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    global.user_id = user1;
    saveRes = httpMocks.createResponse();
    await index(req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
});

let userSchema = null;
let taskSchema = null;
let patchTaskSchema = null;
try {
  userSchema = require("../validation/userSchema").userSchema;
  ({ taskSchema, patchTaskSchema } = require("../validation/taskSchema"));
} catch {}

it("finds the user and task schemas", () => {
  expect(userSchema).toBeDefined();
  expect(taskSchema).toBeDefined();
});

if (userSchema) {
  describe("user object validation tests", () => {
    it("doesn't permit a trivial password", () => {
      const { error } = userSchema.validate(
        { name: "Bob", email: "bob@sample.com", password: "password" },
        { abortEarly: false },
      );
      expect(
        error.details.find((detail) => detail.context.key == "password"),
      ).toBeDefined();
    });
    it("The user schema requires that an email be specified.", () => {
      const { error } = userSchema.validate(
        { name: "Bob", password: "Pa$$word20" },
        { abortEarly: false },
      );
      expect(
        error.details.find((detail) => detail.context.key == "email"),
      ).toBeDefined();
    });
    it("The user schema does not accept an invalid email.", () => {
      const { error } = userSchema.validate(
        { name: "Bob", email: "bob_at_sample.com", password: "Pa$$word20" },
        { abortEarly: false },
      );
      expect(
        error.details.find((detail) => detail.context.key == "email"),
      ).toBeDefined();
    });
    it("The user schema requires a password.", () => {
      const { error } = userSchema.validate(
        { name: "Bob", email: "bob@sample.com" },
        { abortEarly: false },
      );
      expect(
        error.details.find((detail) => detail.context.key == "password"),
      ).toBeDefined();
    });
    it("The user schema requires name.", () => {
      const { error } = userSchema.validate(
        {
          email: "bob@sample.com",
          password: "Pa$$word20",
        },
        { abortEarly: false },
      );
      expect(
        error.details.find((detail) => detail.context.key == "name"),
      ).toBeDefined();
    });
    it("The name must be valid (3 to 30 characters).", () => {
      const { error } = userSchema.validate(
        { name: "B", email: "bob@sample.com", password: "Pa$$word20" },
        { abortEarly: false },
      );
      expect(
        error.details.find((detail) => detail.context.key == "name"),
      ).toBeDefined();
    });
    it("If validation is performed on a valid user object, error comes back falsy.", () => {
      const { error } = userSchema.validate(
        { name: "Bob", email: "bob@sample.com", password: "Pa$$word20" },
        { abortEarly: false },
      );
      expect(error).toBeFalsy();
    });
  });
}

if (taskSchema) {
  describe("task object validation test", () => {
    it("The task schema requires a title.", () => {
      const { error } = taskSchema.validate({ isCompleted: true });
      expect(
        error.details.find((detail) => detail.context.key == "title"),
      ).toBeDefined();
    });
    it("If an isCompleted value is specified, it must be valid.", () => {
      const { error } = taskSchema.validate({
        title: "first task",
        isCompleted: "baloney",
      });
      expect(
        error.details.find((detail) => detail.context.key == "isCompleted"),
      ).toBeDefined();
    });
    it("If an isCompleted value is not specified but the rest of the object is valid, a default of false is provided by validation", () => {
      const { value } = taskSchema.validate({ title: "first task" });
      expect(value.isCompleted).toBe(false);
    });
    it("If `isCompleted` in the provided object has the value `true`, it remains `true` after validation.", () => {
      const { value } = taskSchema.validate({
        title: "first task",
        isCompleted: true,
      });
      expect(value.isCompleted).toBe(true);
    });
  });

  describe("patchTask object validation test", () => {
    it("Test that the title is not required in this case.", () => {
      const { error } = patchTaskSchema.validate({ isCompleted: true });
      expect(error).toBeFalsy();
    });
    it("Test that if no value is provided for `isCompleted`, that this remains undefined in the returned value.", () => {
      const { value } = patchTaskSchema.validate({ title: "first task" });
      expect(value.isCompleted).toBeUndefined();
    });
  });
}
