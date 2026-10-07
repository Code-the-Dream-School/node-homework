const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "sample-files", "sample.txt");

// Write a sample file for demonstration
const sampleDir = path.join(__dirname, "sample-files");

// 1. Callback style
fs.mkdir(sampleDir, (error) => {
  if (error && error.code !== "EEXIST") {
    console.error("Error creating directory:", error);
    return;
  }
  fs.writeFile(filePath, "Hello, async world!", (error) => {
    if (error) {
      console.error("Error writing file:", error);
      return;
    }
    console.log("File written successfully.");
    fs.readFile(filePath, "utf8", (error, data) => {
      if (error) {
        console.error("Error reading file:", error);
        return;
      }
      console.log("Callback:", data);
    });
    // 2. Promise style
    fs.promises
      .readFile(filePath, "utf8")
      .then((data) => {
        console.log("Promise:", data);
      })
      .catch((error) => {
        console.error("Error reading file (Promise):", error);
      });

    // 3. Async/Await style
    async function readFileAsync() {
      try {
        const data = await fs.promises.readFile(filePath, "utf8");
        console.log("Async/Await:", data);
      } catch (error) {
        console.error("Error reading file (Async/Await):", error);
      }
    }
    readFileAsync();
  });
});

// Callback hell example (test and leave it in comments):
// callback hell happens when you have multiple nested callbacks, making the code hard to read and maintain. Here's an example of callback hell:
// callbackHell(() => {
//   doSomething(() => {
//     doSomethingElse(() => {
//       doAnotherThing(() => {
//       // and so on...
//       });
//     });
//   });
// });
