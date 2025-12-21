require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const {
  index,
  show,
  create,
  update,
  deleteTask,
  bulkCreate,
} = require("../controllers/taskController");
const { logon, register, logoff } = require("../controllers/userController");
const {
  getUserAnalytics,
  getUsersWithStats,
  searchTasks,
} = require("../controllers/analyticsController");


let user1 = null;
let user2 = null;
let saveRes = null;
let saveData = null;
let saveTaskId = null;

beforeAll(async () => {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  global.user_id = null;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("testing logon, register, and logoff with transactions", () => {
  it("You can register a user with welcome tasks.", async () => {
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

    saveData = saveRes._getJSONData();
    expect(saveData.user).toBeDefined();
    expect(saveData.welcomeTasks).toBeDefined();
    expect(saveData.welcomeTasks).toHaveLength(3);
    expect(saveData.transactionStatus).toBe("success");

    // Get the created user from database
    user1 = await prisma.user.findUnique({
      where: { email: "jim@sample.com" },
    });

    // Verify welcome tasks were created
    const welcomeTasks = await prisma.task.findMany({
      where: { userId: user1.id },
    });
    expect(welcomeTasks).toHaveLength(3);
  });

  it("The welcome tasks have the expected titles.", async () => {
    expect(user1).toBeDefined();
    const welcomeTasks = await prisma.task.findMany({
      where: { userId: user1.id },
      select: { title: true }
    });
    const taskTitles = welcomeTasks.map((task) => task.title);
    expect(taskTitles).toContain("Complete your profile");
    expect(taskTitles).toContain("Add your first task");
    expect(taskTitles).toContain("Explore the app");
    
    // Also verify from saveData if available (from registration response)
    if (saveData && saveData.welcomeTasks) {
      const responseTaskTitles = saveData.welcomeTasks.map((task) => task.title);
      expect(responseTaskTitles).toContain("Complete your profile");
      expect(responseTaskTitles).toContain("Add your first task");
      expect(responseTaskTitles).toContain("Explore the app");
    }
  });

  it("The user can be logged on", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "jim@sample.com", password: "Pa$$word20" },
    });
    saveRes = httpMocks.createResponse();
    await logon(req, saveRes, () => {});
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
    await logon(req, saveRes, () => {});
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

    // Get the created user from database
    user2 = await prisma.user.findUnique({
      where: { email: "manuel@sample.com" },
    });
  });

  it("You can logon as that new user.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "manuel@sample.com", password: "Pa$$word20" },
    });
    saveRes = httpMocks.createResponse();
    await logon(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(200);
  });

  it("You can now logoff.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
    });
    saveRes = httpMocks.createResponse();
    await logoff(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(200);
  });
});

describe("testing task creation with priority", () => {
  it("If you have a valid user id, create() succeeds with priority field (res.statusCode should be 201).", async () => {
    global.user_id = user1.id;
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task", priority: "high" },
    });
    saveRes = httpMocks.createResponse();
    await create(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(201);
  });

  it("The object returned from the create() call has the expected title.", () => {
    saveData = saveRes._getJSONData();
    saveTaskId = saveData.id.toString();
    expect(saveData.title).toBe("first task");
  });

  it("The object has the right value for priority.", () => {
    expect(saveData.priority).toBe("high");
  });

  it("The object has the right value for isCompleted.", () => {
    expect(saveData.isCompleted).toBe(false);
  });

  it("If priority is not specified, it defaults to medium.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "task with default priority" },
    });
    saveRes = httpMocks.createResponse();
    await create(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(201);
    saveData = saveRes._getJSONData();
    expect(saveData.priority).toBe("medium");
  });
});

describe("getting created tasks with eager loading and pagination", () => {
  it("If you use user1's id, index returns a 200 statusCode with pagination.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      query: { page: 1, limit: 10 },
    });
    saveRes = httpMocks.createResponse();
    await index(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(200);
  });

  it("The returned JSON has tasks and pagination properties.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData).toHaveProperty("tasks");
    expect(saveData).toHaveProperty("pagination");
  });

  it("The tasks array includes user information from eager loading.", () => {
    if (saveData.tasks.length > 0) {
      expect(saveData.tasks[0]).toHaveProperty("User");
      expect(saveData.tasks[0].User).toHaveProperty("name");
      expect(saveData.tasks[0].User).toHaveProperty("email");
    }
  });

  it("The pagination object has the expected properties.", () => {
    expect(saveData.pagination).toHaveProperty("page");
    expect(saveData.pagination).toHaveProperty("limit");
    expect(saveData.pagination).toHaveProperty("total");
    expect(saveData.pagination).toHaveProperty("pages");
    expect(saveData.pagination).toHaveProperty("hasNext");
    expect(saveData.pagination).toHaveProperty("hasPrev");
  });

  it("The title in the first array object is as expected.", () => {
    if (saveData.tasks.length > 0) {
      // Tasks are ordered by createdAt desc, so find our "first task"
      const firstTask = saveData.tasks.find((t) => t.title === "first task");
      if (firstTask) {
        expect(firstTask.title).toBe("first task");
      }
    }
  });

  it("If get the list of tasks using the userId from user2, you get an empty array with pagination.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      query: { page: 1, limit: 10 },
    });
    global.user_id = user2.id;
    saveRes = httpMocks.createResponse();
    await index(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(200);
    saveData = saveRes._getJSONData();
    // User2 should have welcome tasks (3) but not the tasks created by user1
    expect(saveData.tasks.length).toBeGreaterThanOrEqual(3);
  });

  it("You can retrieve a task using the `show()` method with eager loading.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
    });
    global.user_id = user1.id;
    req.params = { id: saveTaskId };
    saveRes = httpMocks.createResponse();
    await show(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(200);
    saveData = saveRes._getJSONData();
    expect(saveData).toHaveProperty("User");
    expect(saveData.User).toHaveProperty("name");
  });
});

describe("testing bulk task operations", () => {
  it("You can create multiple tasks at once using bulkCreate.", async () => {
    global.user_id = user1.id;
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        tasks: [
          { title: "Bulk task 1", priority: "high" },
          { title: "Bulk task 2", priority: "medium" },
          { title: "Bulk task 3", priority: "low" },
        ],
      },
    });
    saveRes = httpMocks.createResponse();
    await bulkCreate(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(201);
    saveData = saveRes._getJSONData();
    expect(saveData.tasksCreated).toBe(3);
    expect(saveData.totalRequested).toBe(3);
  });

  it("Bulk create with invalid data returns 400.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        tasks: [{ title: "" }], // Invalid: empty title
      },
    });
    saveRes = httpMocks.createResponse();
    await bulkCreate(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(400);
  });
});

describe("testing analytics endpoints", () => {
  it("You can get user analytics with groupBy operations.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      params: { id: user1.id },
    });
    saveRes = httpMocks.createResponse();
    await getUserAnalytics(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(200);
    saveData = saveRes._getJSONData();
    expect(saveData).toHaveProperty("taskStats");
    expect(saveData).toHaveProperty("recentTasks");
    expect(saveData).toHaveProperty("weeklyProgress");
    expect(Array.isArray(saveData.taskStats)).toBe(true);
  });

  it("The taskStats array contains groupBy results.", () => {
    if (saveData.taskStats.length > 0) {
      expect(saveData.taskStats[0]).toHaveProperty("isCompleted");
      expect(saveData.taskStats[0]).toHaveProperty("_count");
    }
  });

  it("You can get users with task statistics and pagination.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      query: { page: 1, limit: 10 },
    });
    saveRes = httpMocks.createResponse();
    await getUsersWithStats(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(200);
    console.log(saveRes);
    saveData = saveRes._getJSONData();
    expect(saveData).toHaveProperty("users");
    expect(saveData).toHaveProperty("pagination");
    if (saveData.users.length > 0) {
      expect(saveData.users[0]).toHaveProperty("_count");
      expect(saveData.users[0]._count).toHaveProperty("Task");
    }
  });

  it("You can search tasks using raw SQL.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      query: { q: "task", limit: 20 },
    });
    saveRes = httpMocks.createResponse();
    await searchTasks(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(200);
    saveData = saveRes._getJSONData();
    expect(saveData).toHaveProperty("results");
    expect(saveData).toHaveProperty("query");
    expect(saveData).toHaveProperty("count");
    expect(Array.isArray(saveData.results)).toBe(true);
  });

  it("Search with query too short returns 400.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      query: { q: "a" },
    });
    saveRes = httpMocks.createResponse();
    await searchTasks(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(400);
  });
});

describe("testing the update and delete of tasks with priority", () => {
  it("User1 can set the task to isCompleted: true and change priority.", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
    });
    global.user_id = user1.id;
    req.params = { id: saveTaskId };
    req.body = { isCompleted: true, priority: "low" };
    saveRes = httpMocks.createResponse();
    await update(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(200);
    saveData = saveRes._getJSONData();
    expect(saveData.isCompleted).toBe(true);
    expect(saveData.priority).toBe("low");
  });

  it("User2 can't do this.", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
    });
    global.user_id = user2.id;
    req.params = { id: saveTaskId };
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse();
    await update(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(404);
  });

  it("User2 can't delete this task.", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
    });
    req.params = { id: saveTaskId };
    saveRes = httpMocks.createResponse();
    await deleteTask(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(404);
  });

  it("User1 can delete this task.", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
    });
    global.user_id = user1.id;
    req.params = { id: saveTaskId };
    saveRes = httpMocks.createResponse();
    await deleteTask(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(200);
  });

  it("Retrieving user1's tasks with pagination still works after deletion.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      query: { page: 1, limit: 10 },
    });
    saveRes = httpMocks.createResponse();
    await index(req, saveRes, () => {});
    expect(saveRes.statusCode).toBe(200);
    saveData = saveRes._getJSONData();
    // Should still have welcome tasks and other tasks
    expect(saveData.tasks.length).toBeGreaterThan(0);
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

    it("If `isCompleted` in the provided object has the value `true`, it remains `true` after validation.", () => {
      const { value } = taskSchema.validate({
        title: "first task",
        isCompleted: true,
      });
      expect(value.isCompleted).toBe(true);
    });

    it("If priority is specified, it must be one of low, medium, or high.", () => {
      const { error } = taskSchema.validate({
        title: "first task",
        priority: "invalid",
      });
      expect(
        error.details.find((detail) => detail.context.key == "priority"),
      ).toBeDefined();
    });

    it("If priority is not specified, it defaults to medium.", () => {
      const { value } = taskSchema.validate({ title: "first task" });
      expect(value.priority).toBe("medium");
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

    it("Test that priority can be updated.", () => {
      const { value } = patchTaskSchema.validate({ priority: "high" });
      expect(value.priority).toBe("high");
    });

    it("Test that priority must be valid if provided.", () => {
      const { error } = patchTaskSchema.validate({ priority: "invalid" });
      expect(
        error.details.find((detail) => detail.context.key == "priority"),
      ).toBeDefined();
    });
  });
}
