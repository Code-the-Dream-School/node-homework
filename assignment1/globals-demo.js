// @ts-nocheck
// Log __dirname and __filename
console.log("__dirname:", __dirname);
console.log("__filename:", __filename);

// Log process ID and platform
console.log("Process ID:", process.pid);
console.log("Platform:", process.platform);

// Attach a custom property to global and log it
global.myCustomVar = "Hello, global!";
console.log("Custom global variable:", global.myCustomVar);
