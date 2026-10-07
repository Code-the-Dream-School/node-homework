const os = require('os');
const path = require('path');
const fs = require('fs');

const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log("Platform:", os.platform());
console.log("CPU:", os.cpus());
console.log("Total Memory:", os.totalmem());

// Path module
console.log("Joined path:", path.join(__dirname, 'sample-files'));

// fs.promises API
fs.promises.writeFile(path.join(sampleFilesDir, 'demo.txt'), 'Hello from fs.promises!')
  .then(() => fs.promises.readFile(path.join(sampleFilesDir, 'demo.txt'), 'utf8'))
  .then(data => console.log("fs.promises read:", data))
  .catch(err => console.error("Error with fs.promises:", err));

