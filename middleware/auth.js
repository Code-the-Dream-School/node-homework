const { StatusCodes } = require("http-status-codes");

const a = (req, res, next) => {
  if (global.user_id == null) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "unauthorized" });
  }
  next();
};
module.exports = a;
