# Node.js Fundamentals

## What is Node.js?

Node.js is a runtime that let's you run javascript outside the browser, on your computer or a server

## How does Node.js differ from running JavaScript in the browser?

Node is a way to run javascript directly on a computer with no browser sandbox. Node lets JavaScript run outside the browser.

## What is the V8 engine, and how does Node use it?

V8 engine is the high-performance JavaScript engine Google originally buit for the Chrome browser.

## What are some key use cases for Node.js?

Read and write files. Start a web server. Read environment variables. Work with operating system services. Use backend libraries like express.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

**CommonJS (default in Node.js):**
Imports code with require(). require() loads another file or package, and destructuring pulls out the specific values you want to use

```js
// const { register, logoff } = require(".../controllers/userController");
```

**ES Modules (supported in modern Node.js):**
File asks for specific tools from another package or file

```js
// import { useState, useEffect } from "react";
```
