# Node.js Fundamentals – Solution

## What is Node.js?
Node.js is a runtime environment that allows you to run JavaScript code outside of a browser, built on Chrome's V8 JavaScript engine. It enables server-side scripting and is commonly used for building APIs, web servers, and command-line tools.

## How does Node.js differ from running JavaScript in the browser?
- Node.js runs on the server, not in the browser.
- Node provides access to the file system, network, and OS, while browsers restrict access for security.
- Node uses CommonJS modules by default, while browsers use ES Modules (with some support for CommonJS via bundlers).
- Node does not have browser-specific APIs like `window` or `document`.

## What is the V8 engine, and how does Node use it?
The V8 engine is Google's open-source JavaScript engine, used in Chrome. Node.js uses V8 to compile and execute JavaScript code on the server, providing fast performance and access to low-level system resources.

## What are some key use cases for Node.js?
- Building RESTful APIs
- Real-time applications (e.g., chat apps)
- Command-line tools
- Streaming applications
- Microservices

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

**CommonJS (default in Node.js):**
```js
// math.js
module.exports.add = (a, b) => a + b;

// app.js
const math = require('./math');
console.log(math.add(2, 3));
```

**ES Modules (supported in modern Node.js):**
```js
// math.mjs
export function add(a, b) { return a + b; }

// app.mjs
import { add } from './math.mjs';
console.log(add(2, 3));
``` 