const express = require("express");

const router = express.Router();
const { register, logon, logoff } = require("../controllers/userController");

router.route("/").post(register);

router.route("/logon").post(logon);

router.route("/logoff").post(logoff);

module.exports = router;
