module.exports = {
  rootDir: "../../.",
  moduleNameMapper: {
    ".*validation/taskSchema.*": "<rootDir>/lesson9TDD/mocks/taskSchema.js",
    ".*validation/userSchema.*": "<rootDir>/lesson9TDD/mocks/userSchema.js",
    ".*controllers/taskController.*": "<rootDir>/lesson9TDD/mocks/taskController.js",
    ".*controllers/userController.*": "<rootDir>/lesson9TDD/mocks/userController.js",
  },
  reporters: [
    "default",
    "./lesson9TDD/jestConfig/TDDReporter.js"
  ]
};