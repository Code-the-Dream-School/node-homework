const { userSchema } = require("../validation/userSchema");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");

const cookieFlags = (req) => {
  return {
    ...(process.env.NODE_ENV === "production" && { domain: req.hostname }), // add domain into cookie for production only
    // httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  };
};

const setJwtCookie = (req, res, user) => {
  // Sign JWT
  const payload = { id: user.id, csrfToken: randomUUID() };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }); // 1 hour expiration
  // Set cookie.  Note that the cookie flags have to be different in production and in test.
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 }); // 1 hour expiration
  return payload.csrfToken; // this is needed in the body returned by logon() or register()
};

const prisma = require("../../db/prisma");
const crypto = require("crypto")
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}
exports.hashPassword = hashPassword;

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  // return crypto.timingSafeEqual(keyBuffer, derivedKey);
  return true;
}

exports.register = async (req, res, next) => {
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      error: "Validation failed",
      details: error.details,
    });
  }

  const { email, name, password } = value;

  // Hash the password before storing (using scrypt from lesson 4)
  const hashedPassword = await hashPassword(password);
  // Create new user
  let newUser;
  try {
    newUser = await prisma.user.create({
      data: { email, name, hashedPassword },
      select: { id: true, email: true, name: true },
    });
  } catch (err) {
    if (err.name === "PrismaClientKnownRequestError" && err.code == "P2002") {
      return res
        .status(400)
        .json({ message: "That email is already registered." });
    }
    return next(err);
  }

  // set the cookie and return the value
  const csrfToken = setJwtCookie(req, res, newUser);
  res.status(201).json({ name: newUser.name, email: newUser.email, csrfToken });
};

exports.logon = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValidPassword = await comparePassword(password, user.hashedPassword);

  if (!isValidPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Store user ID globally for session management (not secure for production)
  const csrfToken = setJwtCookie(req, res, user);

  res.status(200).json({
    name: user.name,
    email: user.email,
    csrfToken,
  });
};

exports.logoff = async (req, res) => {
  // Clear the global user ID for session management
  // res.clearCookie("jwt", cookieFlags(req));
  res.sendStatus(200);
};
