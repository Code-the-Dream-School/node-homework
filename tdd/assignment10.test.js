require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.RECAPTCHA_BYPASS = process.env.JWT_SECRET;
const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const EventEmitter = require("events").EventEmitter;
const jwt = require("jsonwebtoken");
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");

const {
  index,
  show,
  create,
  update,
  deleteTask,
} = require("../controllers/taskController");
const { register, logoff, logon } = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const cookie = require("cookie");
function MockResponseWithCookies() {
  const res = httpMocks.createResponse({
    eventEmitter: EventEmitter,
  });
  res.cookie = (name, value, options = {}) => {
    const serialized = cookie.serialize(name, String(value), options);
    let currentHeader = res.getHeader("Set-Cookie");
    if (currentHeader === undefined) {
      currentHeader = [];
    }
    currentHeader.push(serialized);
    res.setHeader("Set-Cookie", currentHeader);
  };
  return res;
}

// a few useful globals
let user1 = null;
let user2 = null;
let saveRes = null;
let saveData = null;
let saveTaskId = null;

beforeAll(async () => {
  await prisma.Task.deleteMany(); // delete all tasks
  await prisma.User.deleteMany(); // delete all users
});

afterAll(async () => {
  await prisma.$disconnect();
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
    req.headers["X-Recaptcha-Test"] = process.env.JWT_SECRET;
    saveRes = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });
    await waitForRouteHandlerCompletion(register, req, saveRes);
    expect(saveRes.statusCode).toBe(201);
    user1 = await prisma.user.findUnique({
      where: { email: "jim@sample.com" },
    });
  }, 15000); // needed a longer timeout
  it("The user can be logged on", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "jim@sample.com", password: "Pa$$word20" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logon, req, saveRes);
    expect(saveRes.statusCode).toBe(200); // success!
  });
  it("A string in the Set-Cookie array starts with jwt=.", () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((str) => str.startsWith("jwt="));
    expect(jwtCookie).toBeDefined();
  });
  it("That string contains HttpOnly;.", () => {
    expect(jwtCookie).toContain("HttpOnly");
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
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logon, req, saveRes);
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
    req.headers["X-Recaptcha-Test"] = process.env.JWT_SECRET;
    saveRes = httpMocks.createResponse();
    await register(req, saveRes);
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
    req.headers["X-Recaptcha-Test"] = process.env.JWT_SECRET;
    saveRes = httpMocks.createResponse();
    await register(req, saveRes);
    expect(saveRes.statusCode).toBe(201);
    user2 = await prisma.user.findUnique({
      where: { email: "manuel@sample.com" },
    });
  });
  it("You can logon as that new user.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "manuel@sample.com", password: "Pa$$word20" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logon, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("You can now logoff.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });
    saveRes = MockResponseWithCookies();
    await logoff(req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("The logoff clears the cookie.", () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((str) => str.startsWith("jwt="));
    expect(jwtCookie).toContain("Jan 1970");
  });
});

describe("Testing JWT middleware", () => {
  it("Returns a 401 if the JWT is not present", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });
  it("Returns a 401 if the JWT is invalid", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });
    saveRes = MockResponseWithCookies();
    const jwtCookie = jwt.sign({ id: 5, csrfToken: "badToken" }, "badSecret", {
      expiresIn: "1h",
    });
    req.cookies = { jwt: jwtCookie };
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });
  it("Returns a 401 if the JWT is valid but the token isn't", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });
    saveRes = MockResponseWithCookies();
    const jwtCookie = jwt.sign(
      { id: 5, csrfToken: "badtoken" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    req.cookies = { jwt: jwtCookie };
    if (!req.headers) {
      req.headers = {};
    }
    req.headers["X-CSRF-TOKEN"] = "goodtoken";
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });
  it("Calls next() if both the token and the jwt are good.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });
    saveRes = MockResponseWithCookies();
    const jwtCookie = jwt.sign(
      { id: 5, csrfToken: "goodtoken" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    req.cookies = { jwt: jwtCookie };
    if (!req.headers) {
      req.headers = {};
    }
    req.headers["X-CSRF-TOKEN"] = "goodtoken";
    const next = await waitForRouteHandlerCompletion(
      jwtMiddleware,
      req,
      saveRes,
    );
    saveReq = req;
    expect(next).toHaveBeenCalled();
  });
  it("Sets the req.user before calling next()", () => {
    expect(saveReq.user.id).toBe(5);
  });
});
describe("testing task creation", () => {
  it("cant create a task without a user id", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("TypeError");
    }
  });
  it("You can't create a task with a bogus user id.", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    req.user = { id: 72348 };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("PrismaClientKnownRequestError");
    }
  });
  it("If you have a valid user id, create() succeeds (res.statusCode should be 201).", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    req.user = user1;
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await create(req, saveRes);
    expect(saveRes.statusCode).toBe(201);
  });
  it("The object returned from the create() call has the expected title.", () => {
    saveData = saveRes._getJSONData();
    saveTaskId = saveData.id.toString();
    expect(saveData.title).toBe("first task");
  });
  it("The object has the right value for isCompleted.", () => {
    expect(saveData.isCompleted).toBe(false);
  });
  it("The object does not have any value for userId.", () => {
    expect(saveData.userId).not.toBeDefined();
  });
});

describe("getting created tasks", () => {
  it("If you use user1's id, index returns a 200 statusCode.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    req.user = user1;
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await index(req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("The returned JSON array has length 4.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.tasks).toHaveLength(4);
  });
  it("The title in the first array object is as expected.", () => {
    expect(saveData.tasks[0].title).toBe("first task");
  });
  it("The first array object does not contain a userId.", () => {
    expect(saveData.tasks[0].userId).not.toBeDefined();
  });
  it("If get the list of tasks using the userId from user2, you get 3", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    req.user = user2;
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await index(req, saveRes);
    const data = saveRes._getJSONData();
    expect(data.tasks.length).toBe(3);
  });
  it("You can retrieve the first array object using the `show()` method of the controller.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    req.user = user1;
    req.params = { id: saveTaskId };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await show(req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
});

describe("testing the update and delete of tasks.", () => {
  it("User1 can set the task to isCompleted: true.", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
    });
    req.user = user1;
    req.params = { id: saveTaskId };
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await update(req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("User2 can't do this.", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
    });
    req.user = user2;
    req.params = { id: saveTaskId };
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await update(req, saveRes);
    expect(saveRes.statusCode).not.toBe(200);
  });
  it("User2 can't delete this task.", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
    });
    req.user = user2;
    req.params = { id: saveTaskId };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await deleteTask(req, saveRes);
    expect(saveRes.statusCode).not.toBe(200);
  });
  it("User1 can delete this task.", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
    });
    req.user = user1;
    req.params = { id: saveTaskId };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await deleteTask(req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("Retrieving user1's tasks now returns 3 tasks", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    req.user = user1;
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await index(req, saveRes);
    saveData = saveRes._getJSONData();
    expect(saveData.tasks.length).toBe(3);
  });
});

let userSchema = null;
let taskSchema = null;
let patchTaskSchema = null;
try {
  userSchema = require("../validation/userSchema").userSchema;
  ({ taskSchema, patchTaskSchema } = require("../validation/taskSchema"));
} catch {
  // these won't be built at the start, but we want the test to proceed
}
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
    it("If `isCompleted` in the provided object has the value `true`, it remains `true` after validation.", () => {});
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

describe("function tests of user operations", () => {
  const request = require("supertest");
  const { app, server } = require("../app");
  let agent;

  beforeAll(async () => {
    await server.close(); // we want the server instance to be managed by the agent.
    agent = request.agent(app);
  });

  // afterAll(async () => {
  //   await server.close();
  // });

  describe("register a user ", () => {
    it("46. it creates the user entry", async () => {
      const newUser = {
        name: "John Deere",
        email: "jdeere@example.com",
        password: "Pa$$word20",
      };
      saveRes = await agent.post("/api/users/register")
        .set("X-Recaptcha-Test", process.env.JWT_SECRET).send(newUser);
      expect(saveRes.status).toBe(201);
    });
    it("47. Registration returns an object with the expected name.", () => {
      expect(saveRes.body.user.name).toBe("John Deere");
    });
    it("48. The returned object includes a csrfToken.", () => {
      expect(saveRes.body.csrfToken).toBeDefined();
    });
    it("49. You can logon as the newly registered user.", async () => {
      const logonObj = { email: "jdeere@example.com", password: "Pa$$word20" };
      saveRes = await agent.post("/api/users/logon").send(logonObj);
      expect(saveRes.status).toBe(200);
    });
    it("50. See if you are logged in", async () => {
      const res = await agent.get("/api/tasks");
      expect(res.status).not.toBe(401);
    });
    it("51. You can logoff.", async () => {
      const token = saveRes.body.csrfToken;
      expect(token).toBeDefined();
      saveRes = await agent
        .post("/api/users/logoff")
        .set("X-CSRF-TOKEN", token)
        .send();
      expect(saveRes.status).toBe(200);
    });
    it("52. Makes sure we are logged out", async () => {
      const res = await agent.get("/api/tasks");
      expect(res.status).toBe(401);
    });
  });
});
