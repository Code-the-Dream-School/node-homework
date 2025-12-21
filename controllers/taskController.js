const { StatusCodes } = require("http-status-codes");
const { taskSchema } = require("../validation/taskSchema.js");

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

const create = (req, res) => {
  if (!req.body) req.body = {};
  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json(error);
  }

  const newTask = {
    ...value,
    id: taskCounter(),
    userId: global.user_id.email,
  };
  global.tasks.push(newTask);
  const { userId, ...sanitizedTask } = newTask;
  // we don't send back the userId! This statement removes it.
  res.status(StatusCodes.CREATED).json(sanitizedTask);
};

const index = (req, res) => {
  //get tasks for current user
  let tasks = global.tasks
    .filter((task) => task.userId === global.user_id.email)
    .map(({ userId, ...rest }) => rest);

  if (tasks.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "No tasks found for this user." });
  }
  res.status(200).json(tasks);
};

const show = (req, res) => {
  const taskToFind = parseInt(req.params?.id); // if there are no params, the ? makes sure that you
  // get a null
  if (!taskToFind) {
    return res
      .statusrun(400)
      .json({ message: "The task ID passed is not valid." });
  }
  let task = global.tasks.find(
    (task) => task.userId === global.user_id.email && task.id === taskToFind
  );

  if (!task) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Task not found." });
  }

  const { userId, ...sanTask } = task;
  res.status(200).json(sanTask);
};

const update = (req, res) => {
  const taskToFind = parseInt(req.params?.id);

  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }

  // find index
  const taskIndex = global.tasks.findIndex(
    (task) => task.userId === global.user_id.email && task.id === taskToFind
  );
  if (taskIndex === -1) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Task not found." });
  }

  // get task
  const originalTask = global.tasks[taskIndex];

  // update task object
  const updatedTask = {
    ...originalTask, // Start with old data
    ...req.body, // Overwrite with new data
    id: originalTask.id, // FORCE id to remain the same
    userId: originalTask.userId, // FORCE userId to remain the same
  };

  // save back
  global.tasks[taskIndex] = updatedTask;

  // sanitize and return
  const { userId, ...sanitizedTask } = updatedTask;
  res.json(sanitizedTask);
};

const deleteTask = (req, res) => {
  const taskToFind = parseInt(req.params?.id); // if there are no params, the ? makes sure that you
  // get a null
  if (!taskToFind) {
    return res
      .status(400)
      .json({ message: "The task ID passed is not valid." });
  }
  const taskIndex = global.tasks.findIndex(
    (task) => task.id === taskToFind && task.userId === global.user_id.email
  );
  // we get the index, not the task, so that we can splice it out
  if (taskIndex === -1) {
    // if no such task
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
    // else it's a 404.
  }
  //const task = { userId, ...global.tasks[taskIndex] }; // make a copy without userId
  const { userId, ...task } = global.tasks[taskIndex];
  global.tasks.splice(taskIndex, 1); // do the delete
  return res.json(task); // return the entry just deleted.  The default status code, OK, is returned
};

module.exports = { create, index, show, update, deleteTask };
