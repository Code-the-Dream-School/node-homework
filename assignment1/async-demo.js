const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname,'sample-files', 'sample.txt');

// Write a sample file for demonstration
const sampleDir = path.join(__dirname, 'sample-files');

// 1. Callback style
fs.mkdir(sampleDir, (error) => {
  if (error && error.code !== 'EEXIST') {
    console.error('Error creating directory:', error);
    return;
  }
  fs.writeFile(filePath, 'sample text', (error) => {
    if (error) {
      console.error('Error writing file:', error);
      return;
    }
    console.log('File written successfully.');

    fs.readFile(filePath, 'utf8', (error, data) => {
      if (error) {
        console.error('Error reading file:', error);
        return;
      }
      console.log('File content:', data);
    });
  });
});

  // Callback hell example (test and leave it in comments):


  // 2. Promise style


      // 3. Async/Await style
