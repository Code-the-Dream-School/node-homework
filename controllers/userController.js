const { userSchema } = require("../validation/userSchema.js");
const { StatusCodes } = require("http-status-codes");

const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

const register = async (req, res) => {
  if (!req.body) req.body = {};
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json(error);
  }
  try {
    const newPass = await hashPassword(value.password);
    const newUser = { ...value, password: newPass }; // this makes a copy
    global.users.push(newUser);
    global.user_id = newUser; // After the registration step, the user is set to logged on.
    const { password, ...userResponse } = newUser;
    res.status(StatusCodes.CREATED).json(userResponse);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Something went really wrong!" });
  }
};

const logon = async (req, res) => {
  const user = global.users.find((user) => user.email == req.body.email);

  if (user === undefined) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed." });
  }

  const isMatch = await comparePassword(req.body.password, user.password);

  if (isMatch) {
    global.user_id = user;
    return res.status(StatusCodes.OK).json({
      name: user.name,
      email: user.email,
    });
  }

  return res
    .status(StatusCodes.UNAUTHORIZED)
    .json({ message: "Authentication Failed." });
};

const logoff = (req, res) => {
  global.user_id = null;
  res.sendStatus(StatusCodes.OK);
};

module.exports = { register, logon, logoff };
