/* The MIT License (MIT)

Copyright (c) 2026 Kathryn J Knight

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/* 
 * Check profiles to check
 *
 * Profiles are supplied as a JSON containing the following for each profile:
 *   Fields as returned from the WikiTree API, including:
 *     "Id,Name,Bio
 *
 * output is csv containing the following for each profile:
 *   Id,Bio
 *   where the Bio is surrounded by " and each line terminated by \r\n
 */

/* 
 * Reads input from a file, writes output to a file. 
 * Writes csv out
 * Can be used in a pipe.
 */


// Get the input "file" names
let args = process.argv;
let inFile = 0;
let outFile = 1;
let useStdout = true;
if (args.length > 2) {
  if (args[2] == '-h') {
    console.log('Usage: -h to report this help');
    console.log('Usage: node filebiocheck.js infile outfile');
    console.log('       when no infile is specified input will be read from stdin ');
    console.log('       when no outfile is specified results will be output to stdout ');
    process.exit(0);
  } else {
    inFile = args[2];
    if (args.length > 3) {
      outFile = args[3];
      useStdout = false;
      if (!useStdout) console.log('Checking from input file: ' + inFile + ' sending output to ' + outFile);
    }
  }
}

/*
 * Read the data, bioCheck the profiles, output the results
 */
let startTime = new Date();

const fs = import('node:fs');
import { readFileSync } from 'node:fs';
import { writeFileSync } from 'node:fs';

try {

  let results = 'Id,Bio\r\n';
  let personNum = 0;
  let inData = readFileSync(inFile, 'utf8');
  let parsedObject = JSON.parse(inData);
  if (!useStdout) console.log('input has ' + parsedObject.length + ' profiles');

  //while ((personNum < parsedObject.length) && (personNum < 20)) {  // for testing
  //while ((personNum < parsedObject.length) && (personNum < 2)) {  // for testing
  while (personNum < parsedObject.length) {
    let profileObj = parsedObject[personNum];
      let bioString = profileObj.bio;

      // Put together results 
      let csvData = profileObj.Id + ',' + '"' +
                    profileObj.bio + '"' + '\r\n'
      results = results + csvData;
    personNum++;
  }
  if (useStdout) {
    process.stdout.write(results);  // cleaner than writeFileSync to 1
  } else {
    writeFileSync(outFile, results, 'utf8');
  }

  if (!useStdout) console.log('processed a total of ' + personNum + ' profiles');

  let endTime = new Date();
  let timeDiff = endTime.getTime() - startTime.getTime();
  timeDiff = timeDiff / 1000;
  if (!useStdout) console.log("Elapsed time (seconds): " + timeDiff);

} catch (err) {
  console.error('Error:', err);
}

