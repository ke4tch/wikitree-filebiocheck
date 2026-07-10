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

import { theSourceRules } from "./SourceRules.js";
import { BioCheckPerson } from "./BioCheckPerson.js";
import { Biography } from "./Biography.js";
import { BioCheckStream } from "./BioCheckStream.js";
import { pipeline } from 'node:stream';
import { createReadStream } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { readFileSync } from 'node:fs';


/* 
 * Check profiles from a file 
 *
 * Profiles are supplied as a csv containing the following for each profile:
 *   Id,Bio
 *   where the Bio is surrounded by " and each line terminated by \r\n
 *
 * Output is csv containing the following
 *   Id: the profile Id
 *   HasStyleIssues: boolean if bioCheck found style issues
 *   HasModernSources: has valid sources
 *   HasTooOldSources:  has valid source born > 150 years ago or died < 100 years ago
 *   HasPre1700Sources:  has valid sources born or died < 1700
 *
 * Uses Templates from a local file named ???
 */

/* 
 * Reads input from a file, writes output to a file. 
 * uses streams and transforms the check along the way
 * Writes csv out
 */

// Get the input "file" names
let TEMPLATE_FILE = './js/templatesExp.json';
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
try {
  // read templates from a file not via a WT+ request
  let templateJson = readFileSync(TEMPLATE_FILE, 'utf8');
  let templateData = JSON.parse(templateJson);
  theSourceRules.loadTemplates(templateData);

  let profileCount = 0;
  let bioCheckStream = new BioCheckStream();
  let readStream = createReadStream(inFile, { encoding: 'utf8' });
  let writeStream = createWriteStream(outFile);

  pipeline(
    readStream,
    bioCheckStream,
    writeStream,
    (err) => {
      if (err) {
        console.error('Pipeline failed:', err);
      } else {
        if (!useStdout) {
          console.log('processed a total of ' + bioCheckStream.getProfileCount() + ' profiles');
          let endTime = new Date();
          let timeDiff = endTime.getTime() - startTime.getTime();
          timeDiff = timeDiff / 1000;
          console.log("Elapsed time (seconds): " + timeDiff);
        }
      }
    }
  );
} catch (err) {
  console.error('Error:', err);
}


