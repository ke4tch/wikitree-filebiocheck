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

import { BioCheckTemplateManager } from "./BioCheckTemplateManager.js";
import { theSourceRules } from "./SourceRules.js";
import { BioCheckPerson } from "./BioCheckPerson.js";
import { Biography } from "./Biography.js";

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
 */

/* 
 * Reads input from a file, writes output to a file. 
 * Writes csv out
 * Can be used in a pipe, unless I broke it
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

let bioCheckTemplateManager = new BioCheckTemplateManager();
try {
  let templatePromise = bioCheckTemplateManager.loadPrep('bioCheckPlus');
  await bioCheckTemplateManager.loadPromisedTemplates(templatePromise);

  let results = 'Id,HasStyleIssues,HasModernSources,HasTooOldSources,HasPre1700Sources\n';
  let personNum = 0;
  let inData = readFileSync(inFile, 'utf8');

  let persons = inData.trim().split('\r\n');
  let cnt = persons.length;
  if (persons[0].substring(0, persons[0].indexOf(',')) == 'Id') {
    personNum++;
    cnt--;
  }
  if (!useStdout) console.log('input has ' + cnt + ' profiles');

  let personString = persons[personNum];
  //while ((personNum < persons.length) && (personNum < 5)) {  // for testing
  while (personNum < persons.length) {

    let personString = persons[personNum];
    let id = personString.substring(0, personString.indexOf(','));
    let bioString = personString.substring(personString.indexOf(',') + 1);

    let thePerson = new BioCheckPerson();
    let biography = new Biography(theSourceRules);
    biography.parse(bioString, thePerson, '');
    biography.validateAllDates();
    let csvData = id + ',' + 
                    Number(biography.hasStyleIssues()) + ',' +
                    Number(biography.hasModernSources()) + ',' + 
                    Number(biography.hasTooOldSources()) + ',' +
                    Number(biography.hasPre1700Sources()) + '\n';
    results = results + csvData;
    personNum++;
  }
  if (useStdout) {
    process.stdout.write(results);  // cleaner than writeFileSync to 1
  } else {
    writeFileSync(outFile, results, 'utf8');
  }

  if (!useStdout) console.log('processed a total of ' + cnt + ' profiles');

  let endTime = new Date();
  let timeDiff = endTime.getTime() - startTime.getTime();
  timeDiff = timeDiff / 1000;
  if (!useStdout) console.log("Elapsed time (seconds): " + timeDiff);

} catch (err) {
  console.error('Error:', err);
}

