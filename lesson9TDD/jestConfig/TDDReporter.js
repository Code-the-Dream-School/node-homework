class Reporter {
  constructor() {
    this.required = {
      "46.": { expected: "passed", observed: "not implemented" },
      "47.": { expected: "passed", observed: "not implemented" },
      "48.": { expected: "passed", observed: "not implemented" },
      "49.": { expected: "passed", observed: "not implemented" },
      "50.": { expected: "passed", observed: "not implemented" },
      "51.": { expected: "passed", observed: "not implemented" },
      "52.": { expected: "failed", observed: "not implemented" },
      "14.": { expected: "passed", observed: "not implemented" },
      "15.": { expected: "passed", observed: "not implemented" },
      "16.": { expected: "passed", observed: "not implemented" },
      "17.": { expected: "passed", observed: "not implemented" },
      "18.": { expected: "passed", observed: "not implemented" },
      "19.": { expected: "failed", observed: "not implemented" },
      "20.": { expected: "failed", observed: "not implemented" },
      "21.": { expected: "passed", observed: "not implemented" },
      "22.": { expected: "passed", observed: "not implemented" },
      "23.": { expected: "passed", observed: "not implemented" },
      "24.": { expected: "failed", observed: "not implemented" },
      "25.": { expected: "failed", observed: "not implemented" },
      "26.": { expected: "passed", observed: "not implemented" },
      "27.": { expected: "failed", observed: "not implemented" },
      "28.": { expected: "failed", observed: "not implemented" },
      "29.": { expected: "failed", observed: "not implemented" },
      "30.": { expected: "failed", observed: "not implemented" },
      "31.": { expected: "passed", observed: "not implemented" },
      "32.": { expected: "failed", observed: "not implemented" },
      "1.": { expected: "failed", observed: "not implemented" },
      "2.": { expected: "failed", observed: "not implemented" },
      "3.": { expected: "failed", observed: "not implemented" },
      "4.": { expected: "failed", observed: "not implemented" },
      "5.": { expected: "failed", observed: "not implemented" },
      "6.": { expected: "failed", observed: "not implemented" },
      "7.": { expected: "passed", observed: "not implemented" },
      "8.": { expected: "passed", observed: "not implemented" },
      "9.": { expected: "failed", observed: "not implemented" },
      "10.": { expected: "failed", observed: "not implemented" },
      "11.": { expected: "passed", observed: "not implemented" },
      "12.": { expected: "failed", observed: "not implemented" },
      "13.": { expected: "passed", observed: "not implemented" },
    };
    this.optional = {
      "33.": { expected: "passed", observed: "not implemented" },
      "35.": { expected: "passed", observed: "not implemented" },
      "36.": { expected: "failed", observed: "not implemented" },
      "37.": { expected: "passed", observed: "not implemented" },
      "38.": { expected: "passed", observed: "not implemented" },
      "39.": { expected: "failed", observed: "not implemented" },
      "40.": { expected: "passed", observed: "not implemented" },
      "41.": { expected: "failed", observed: "not implemented" },
      "42.": { expected: "passed", observed: "not implemented" },
      // "43.": { expected: "passed", observed: "not implemented" },
      // "45.": { expected: "failed", observed: "not implemented" },
      "61.": { expected: "passed", observed: "not implemented" },
      "62.": { expected: "passed", observed: "not implemented" },
      "63.": { expected: "passed", observed: "not implemented" },
      "64.": { expected: "passed", observed: "not implemented" },
      "65.": { expected: "passed", observed: "not implemented" },
    };
  }
  onTestResult(_, result) {
    for (const test of result.testResults) {
      const i = test.title.indexOf(".");
      if (i !== -1) {
        const keyToUse = test.title.slice(0, i + 1);
        if (keyToUse in this.required) {
          this.required[keyToUse].observed = test.status;
          this.required[keyToUse].title = test.title;
        } else if (keyToUse in this.optional) {
          this.optional[keyToUse].observed = test.status;
          this.optional[keyToUse].title = test.title;
        }
      }
    }
  }
  onRunComplete() {
    const requiredCorrect = [];
    const requiredNotImplemented = [];
    const optionalCorrect = [];
    const optionalNotImplemented = [];
    const requiredErrorList = [];
    const optionalErrorList = [];
    for (const key in this.required) {
      if (this.required[key].expected == this.required[key].observed) {
        requiredCorrect.push(parseInt(key));
      } else if (this.required[key].observed == "not implemented") {
        requiredNotImplemented.push(parseInt(key));
      } else {
        requiredErrorList.push({
          testNumber: parseInt(key),
          title: this.required[key].title,
          expected: this.required[key].expected,
          returned: this.required[key].observed,
        });
      }
    }
    for (const key in this.optional) {
      if (this.optional[key].expected == this.optional[key].observed) {
        optionalCorrect.push(parseInt(key));
      } else if (this.optional[key].observed == "not implemented") {
        optionalNotImplemented.push(parseInt(key));
      } else {
        optionalErrorList.push({
          testNumber: parseInt(key),
          title: this.optional[key].title,
          expected: this.optional[key].expected,
          returned: this.optional[key].observed,
        });
      }
    }
    requiredCorrect.sort((a, b) => a - b);
    requiredNotImplemented.sort((a, b) => a - b);
    requiredErrorList.sort((a, b) => a.testNumber - b.testNumber);
    optionalCorrect.sort((a, b) => a - b);
    optionalNotImplemented.sort((a, b) => a - b);
    optionalErrorList.sort((a, b) => a.testNumber - b.testNumber);
    console.log("Required part of the Assignment:");
    console.log("The following tests gave correct results: ", requiredCorrect);
    if (requiredNotImplemented.length > 0) {
      console.log(
        "The following tests were not implemented: ",
        requiredNotImplemented,
      );
    } else {
      console.log("All tests were implemented.");
    }
    if (requiredErrorList.length > 0) {
      console.log("The following tests did not report the expected results:");
      for (const row of requiredErrorList) {
        console.log(
          `⚠️   ${row.title} should have returned ${row.expected} but instead returned ${row.returned}.`,
        );
      }
    } else {
      console.log("All implemented tests gave the expected results.");
    }
    console.log("Optional part of the Assignment:");
    console.log("The following tests gave correct results: ", optionalCorrect);
    if (optionalNotImplemented.length > 0) {
      console.log(
        "The following tests were not implemented: ",
        optionalNotImplemented,
      );
    } else {
      console.log("All tests were implemented.");
    }
    if (optionalErrorList.length > 0) {
      console.log("The following tests did not report the expected results:");
      for (const row of optionalErrorList) {
        console.log(
          `⚠️   ${row.title} should have returned ${row.expected} but instead returned ${row.returned}.`,
        );
      }
    } else {
      console.log("All implemented tests gave the expected results.");
    }
  }
}
module.exports = Reporter;
