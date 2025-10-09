const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "sample-files", "sample.txt");

// Write a sample file for demonstration
fs.writeFileSync(filePath, "Hello, async world!");

// 1. Callback style
fs.readFile(filePath, "utf8", (err, data) => {
  if (err) return console.error("Callback error:", err);
  console.log("Callback read:", data);

  // Callback hell example (in comments):
  /*
  fs.readFile('a.txt', (err, dataA) => {
    fs.readFile('b.txt', (err, dataB) => {
      fs.readFile('c.txt', (err, dataC) => {
        // ...
      });
    });
  });
  */

  // 2. Promise style
  fs.promises
    .readFile(filePath, "utf8")
    .then((data) => {
      console.log("Promise read:", data);

      // 3. Async/Await style
      (async () => {
        try {
          const data = await fs.promises.readFile(filePath, "utf8");
          console.log("Async/Await read:", data);
        } catch (err) {
          console.error("Async/Await error:", err);
        }
      })();
    })
    .catch((err) => {
      console.error("Promise error:", err);
    });
});
