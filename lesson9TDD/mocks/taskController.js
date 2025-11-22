const prisma = require("../../db/prisma");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

exports.index = async (req, res) => {
  const tasks = await prisma.task.findMany({
    // where: { userId: req.user.id },
    select: { title: true, isCompleted: true, id: true, userId: true },
  });

  if (tasks.length === 0) {
    return res.status(404).json({ message: "No tasks found for user" });
  }
  res.status(200).json(tasks);
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
      // userId: req.user.id,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      userId: true, // error!
    },
  });

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.status(200).json(task);
};

exports.create = async (req, res) => {
  // Use global user_id (set during login/registration)
  const { error, value } = taskSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  const newTask = await prisma.task.create({
    data: {
      ...value,
      userId: req.user.id,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      userId: true,  // error!
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
  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }
  let task;
  try {
    task = await prisma.task.update({
      // where: { id, userId: req.user.id },
      where: { id },
      data: value,
      select: { id: true, title: true, isCompleted: true },
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    }
    return next(err);
  }
  res.status(200).json(task);
};

exports.deleteTask = async (req, res, next) => {
  // const id = parseInt(req.params?.id);
  // if (!id) {
  //   return res.status(400).json({ message: "Invalid task id." });
  // }
  // let task;
  // try {
  //   task = await prisma.task.delete({
  //     where: { id, userId: req.user.id },
  //     select: { id: true, title: true, isCompleted: true },
  //   });
  // } catch (err) {
  //   if (err.code === "P2025") {
  //     return res.status(404).json({ message: "The task was not found." });
  //   }
  //   return next(err);
  // }
  // res.status(200).json(task);
  res.json({});
};
