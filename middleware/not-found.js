const { StatusCodes } = require("http-status-codes");

const notfoundHandlerMiddleware = (req, res) => {
  return res
    .status(StatusCodes.NOT_FOUND)
    .send(`You can't do a ${req.method} for ${req.url}`);
};

module.exports = notfoundHandlerMiddleware;
