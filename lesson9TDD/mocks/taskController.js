const prisma = require("../../db/prisma");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

const whereClause = (query) => {
  const filters = [];
  if (query.find) {
    filters.push({ title: { contains: query.find, mode: "insensitive" } });
  }
  if (query.isCompleted) {
    const boolToFind = query.isCompleted === "true";
    filters.push({ isCompleted: boolToFind });
  }
  if (query.priority) {
    filters.push({ priority: query.priority });
  }
  if (query.max_date) {
    filters.push({ createdAt: { lte: new Date(query.max_date) } });
  }
  if (query.min_date) {
    filters.push({ createdAt: { gte: new Date(query.min_date) } });
  }
};

const getFields = (fields) => {
  const fieldList = fields.split(",");
  const taskAttributes = ["title", "priority", "createdAt", "id"];
  const taskFields = fieldList.filter((field) =>
    taskAttributes.includes(field),
  );
  if (taskFields.length === 0) return null; // need at least one task field
  const userAttributes = ["name", "email"];
  const userFields = fieldList.filter((field) =>
    userAttributes.includes(field),
  );
  const taskSelect = Object.fromEntries(
    taskFields.map((field) => [field, true]),
  );
  if (userFields.length) {
    //if we want some user fields
    const userSelect = Object.fromEntries(
      userFields.map((field) => [field, true]),
    );
    taskSelect["User"] = { select: userSelect };
  }
  return taskSelect;
};

exports.index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  let select;
  if (req.query.fields) {
    select = getFields(req.query.fields);
    if (!select) {
      // no task fields specified, not allowed
      return res.status(400).json({
        message:
          "When specifying fields, at least one task field must be included.",
      });
    }
  } else {
    select = {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      userId: true, // bug
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    };
  }

  const tasks = await prisma.task.findMany({
    // where: {
    //   userId: req.user.id, bug
    //   ...whereClause(req.query),
    // },
    select,
    skip: skip,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
  if (tasks.length === 0) {
    return res.status(404).json({ message: "No tasks found for user" });
  }
  const totalTasks = await prisma.task.count({
    // where: { userId: req.user.id }, bug
  });
  const pagination = {
    page,
    limit,
    total: totalTasks,
    pages: Math.ceil(totalTasks / limit),
    hasNext: page * limit < totalTasks,
    hasPrev: page > 1,
  };

  // Return tasks with pagination information
  res.status(200).json({
    tasks,
    pagination,
  });
};

exports.show = async (req, res) => {
  const id = parseInt(req.params?.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid task id." });
  }

  // Use global user_id (set during login/registration)
  const task = await prisma.task.findUnique({
    where: {
      id,
      // userId: req.user.id, bug
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      createdAt: true,
      priority: true,
      userId: true, // bug
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.status(200).json(task);
};

exports.create = async (req, res, next) => {
  // Use global user_id (set during login/registration)
  const { error, value } = taskSchema.validate(req.body);

  if (error) return next(error);

  const newTask = await prisma.task.create({
    data: {
      ...value,
      userId: req.user.id,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      userId: true, // bug
    },
  });
  res.status(201).json(newTask);
};

exports.update = async (req, res, next) => {
  const id = parseInt(req.params?.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid task id." });
  }
  if (!req.body) {
    req.body = {};
  }
  const { error, value } = patchTaskSchema.validate(req.body);
  if (error) return next(error);
  let task;
  try {
    task = await prisma.task.update({
      where: { id, 
        // userId: req.user.id, bug
       },
      data: value,
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
      },
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    }
    return next(err);
  }
  res.status(200).json(task);
};

exports.deleteTask = async (req, res) => {
  // const id = parseInt(req.params?.id);
  // if (!id) {
  //   return res.status(400).json({ message: "Invalid task id." });
  // }
  // let task;
  // try {
  //   task = await prisma.task.delete({
  //     where: { id, userId: req.user.id },
  //     select: {
  //       id: true,
  //       title: true,
  //       isCompleted: true,
  //       priority: true,
  //       createdAt: true,
  //     },
  //   });
  // } catch (err) {
  //   if (err.code === "P2025") {
  //     return res.status(404).json({ message: "The task was not found." });
  //   }
  //   return next(err);
  // }
  // res.status(200).json(task);
  res.json({}); // bug
};

exports.bulkCreate = async (req, res, next) => {
  // Validate the tasks array
  const tasks = req.body?.tasks;
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  // Validate all tasks before insertion
  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) return next(error);
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: req.user.id,
    });
  }

  // Use createMany for batch insertion
  const result = await prisma.task.createMany({
    data: validTasks,
    skipDuplicates: false,
  });

  // Return success message with counts
  // Hint: The test expects message, tasksCreated, and totalRequested
  res.status(201).json({
    // ... you need to return the response object
    message: "success!",
    tasksCreated: result.count,
    totalRequested: validTasks.length,
  });
};
