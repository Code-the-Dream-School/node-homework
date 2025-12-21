const request = require("supertest");
const app = require("../week-3-middleware/app");
const fs = require("fs");
const path = require("path");

let logSpy;
let errorSpy;
let warnSpy;

beforeAll(() => {
	logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
	errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
	warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterAll(() => {
	logSpy.mockRestore();
	errorSpy.mockRestore();
	warnSpy.mockRestore();
});

describe("Assignment 3b: Middleware Integration", () => {
	describe("Built-In Middleware", () => {
		describe("JSON parsing middleware should parse request bodies for POST /adopt", () => {
			let res;
			beforeAll(async () => {
				res = await request(app)
					.post("/adopt")
					.send({ dogName: "Sweet Pea", name: "Ellen", email: "ellen@codethedream.com" })
					.set("Content-Type", "application/json");
			});

			test("POST /adopt with valid JSON body responds with status 201", () => {
				expect(res.status).toBe(201);
			});

			test("POST /adopt returns the expected success message", () => {
				expect(res.body.message).toMatch(
					/Adoption request received. We will contact you at ellen@codethedream.com for further details./
				);
			});
		});

		describe("Static file middleware should serve images from public/images directory", () => {
			let res;
			const imagePath = path.join(__dirname, "../public/images/dachshund.png");

			beforeAll(() => {
				if (!fs.existsSync(imagePath)) {
					fs.mkdirSync(path.dirname(imagePath), { recursive: true });
					fs.writeFileSync(imagePath, "fake image content");
				}
			});

			beforeAll(async () => {
				res = await request(app).get("/images/dachshund.png");
			});

			test("GET /images/dachshund.png responds with status 200", () => {
				expect(res.status).toBe(200);
			});

			test("GET /images/dachshund.png returns image/png content type", () => {
				expect(res.headers["content-type"]).toMatch(/image\/png/);
			});
		});
	});

	describe("Custom Middleware", () => {
		describe("Request ID middleware should add unique request ID to all requests", () => {
			let res;

			beforeAll(async () => {
				res = await request(app).get("/dogs");
			});

			test("Response includes X-Request-Id header with unique request ID", () => {
				expect(res.headers["x-request-id"]).toBeDefined();
			});
		});

		describe("Logging middleware should log all requests with timestamp, method, path, and requestId", () => {
			test("Logs requests in format [timestamp]: METHOD PATH (requestId)", async () => {
				await request(app).get("/dogs");
				expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\[.*\]: GET \/dogs \(.+\)/));
			});
		});

		describe("Error handling middleware should catch uncaught errors and return 500 with requestId", () => {
			let res;

			beforeAll(async () => {
				res = await request(app).get("/error");
			});

			test("GET /error endpoint responds with status 500", () => {
				expect(res.status).toBe(500);
			});

			test("Error response includes requestId in response body", () => {
				expect(res.body.requestId).toBeDefined();
			});

			test("Error response includes 'Internal Server Error' message", () => {
				expect(res.body.error).toBe("Internal Server Error");
			});
		});
	});

	describe("Enhanced Middleware Features", () => {
		describe("Security headers middleware should set security headers on all responses", () => {
			let res;

			beforeAll(async () => {
				res = await request(app).get("/dogs");
			});

			test("Response includes X-Content-Type-Options: nosniff header", () => {
				expect(res.headers["x-content-type-options"]).toBe("nosniff");
			});

			test("Response includes X-Frame-Options: DENY header", () => {
				expect(res.headers["x-frame-options"]).toBe("DENY");
			});

			test("Response includes X-XSS-Protection: 1; mode=block header", () => {
				expect(res.headers["x-xss-protection"]).toBe("1; mode=block");
			});
		});

		describe("Request size limiting middleware should accept requests within the size limit", () => {
			test("POST /adopt with request body within 1mb limit is accepted", async () => {
				const res = await request(app)
					.post("/adopt")
					.send({ dogName: "Sweet Pea", name: "Test User", email: "test@example.com" })
					.set("Content-Type", "application/json");
				expect(res.status).toBe(201);
			});
		});

		describe("Content-Type validation middleware should reject POST requests without application/json content type", () => {
			test("POST /adopt with text/plain content type returns 400 error", async () => {
				const res = await request(app)
					.post("/adopt")
					.send(JSON.stringify({ dogName: "Sweet Pea", name: "Test User", email: "test@example.com" }))
					.set("Content-Type", "text/plain");
				expect(res.status).toBe(400);
				expect(res.body.error).toMatch(/Content-Type must be application\/json/);
			});

			test("GET requests are not validated for content type", async () => {
				const res = await request(app).get("/dogs");
				expect(res.status).toBe(200);
			});
		});

		describe("404 handler should return 404 JSON response for unmatched routes", () => {
			let res;

			beforeAll(async () => {
				res = await request(app).get("/nonexistent-route");
			});

			test("Unmatched route responds with status 404", () => {
				expect(res.status).toBe(404);
			});

			test("404 response includes 'Route not found' error message", () => {
				expect(res.body.error).toBe("Route not found");
			});

			test("404 response includes requestId in response body", () => {
				expect(res.body.requestId).toBeDefined();
			});
		});
	});

	describe("Advanced Error Handling", () => {
		describe("Custom Error Classes", () => {
			describe("A ValidationError (400) should be returned when POST /adopt is missing required fields (name, email, or dogName)", () => {
				let res;

				beforeAll(async () => {
					res = await request(app)
						.post("/adopt")
						.send({ dogName: "Sweet Pea" }) // Intentional: Missing required fields (name and email)
						.set("Content-Type", "application/json");
				});

				test("POST /adopt with missing required fields responds with status 400", () => {
					expect(res.status).toBe(400);
				});

				test("ValidationError response includes error message matching 'Missing required fields'", () => {
					expect(res.body.error).toMatch(/Missing required fields/);
				});

				test("ValidationError response includes requestId in response body", () => {
					expect(res.body.requestId).toBeDefined();
				});
			});

			describe("A NotFoundError (404) should be returned when POST /adopt requests a dog that is not in the list or not available", () => {
				let res;

				beforeAll(async () => {
					res = await request(app)
						.post("/adopt")
						.send({ dogName: "Nonexistent Dog", name: "Test User", email: "test@example.com" })
						.set("Content-Type", "application/json");
				});

				test("POST /adopt with nonexistent or unavailable dog responds with status 404", () => {
					expect(res.status).toBe(404);
				});

				test("NotFoundError response includes error message matching 'not found or not available'", () => {
					expect(res.body.error).toMatch(/not found or not available/);
				});

				test("NotFoundError response includes requestId in response body", () => {
					expect(res.body.requestId).toBeDefined();
				});
			});

			describe("Error logging should use console.warn() for 4xx errors and console.error() for 5xx errors", () => {
				test("ValidationError (400) is logged with console.warn() and message starting with 'WARN: ValidationError'", async () => {
					await request(app)
						.post("/adopt")
						.send({ dogName: "Sweet Pea" })
						.set("Content-Type", "application/json");
					expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/WARN: ValidationError/));
				});

				test("NotFoundError (404) is logged with console.warn() and message starting with 'WARN: NotFoundError'", async () => {
					await request(app)
						.post("/adopt")
						.send({ dogName: "Nonexistent Dog", name: "Test User", email: "test@example.com" })
						.set("Content-Type", "application/json");
					expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/WARN: NotFoundError/));
				});

				test("Server errors (500) are logged with console.error() and message starting with 'ERROR: Error'", async () => {
					await request(app).get("/error");
					expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/ERROR: Error/));
				});
			});
		});
	});
});
