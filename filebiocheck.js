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
 * Profiles are supplied as a JSON containing the following for each profile:
 *   Fields as returned from the WikiTree API, including:
 *     "Id,Name,IsLiving,Privacy,Manager,BirthDate,DeathDate,BirthDateDecade,DeathDateDecade,
 *      FirstName,RealName,LastNameCurrent,LastNameAtBirth,DataStatus,Bio,IsMember,
 *      BirthLocation,DeathLocation,ResearchStatus,Managers";
 *
 * Output is either as JSON or csv and contains the following
 *   Id: the profile Id
 *   Name: the wikitree-id
 *   HasSources: boolean if profile has valid sources
 *   BioScore: the bioCheck score
 *   HasStyleIssues: boolean if bioCheck found style issues
 */

/* 
 * Reads input from a file, writes output to a file. 
 * Writes csv out, unless a file ending in json is specified.
 * Can be used in a pipe.
 */

/* 
 * Note that test was done using a stream reader and stream writer
 * for 50,000 profiles. 
 * Using synchronous blocking I/O it took 16.485 seconds
 * Using a stream reader and writer it took, 18.337 seconds
 * Using a stream reader it took about the same around 18.x seconds
 * What? changed back to sync and it took 18.3 seconds 
 */

// Get the input "file" names
let args = process.argv;
let inFile = 0;
let outFile = 1;
let useStdout = true;
let jsonOut = false;
if (args.length > 2) {
  if (args[2] == '-h') {
    console.log('Usage: -h to report this help');
    console.log('Usage: node filebiocheck.js infile outfile');
    console.log('       when no infile is specified input will be read from stdin ');
    console.log('       when no outfile is specified results will be output to stdout ');
    console.log('       when an outfile is specified, the output will be csv')
    console.log('       to output JSON, use an outfile name that ends with JSON')
    process.exit(0);
  } else {
    inFile = args[2];
    if (args.length > 3) {
      outFile = args[3];
      useStdout = false;
      if (outFile.toLowerCase().endsWith('json')) {
        jsonOut = true;
        if (!useStdout) console.log('Checking from input file: ' + inFile + ' sending output to ' + outFile + ' as JSON');
      } else {
        if (!useStdout) console.log('Checking from input file: ' + inFile + ' sending output to ' + outFile + ' as csv');
      }
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

  let jsonResults = [];
  let results = '';
  let personNum = 0;
  let inData = readFileSync(inFile, 'utf8');
  let parsedObject = JSON.parse(inData);
  if (!useStdout) console.log('input has ' + parsedObject.length + ' profiles');

  //while ((personNum < parsedObject.length) && (personNum < 5)) {  // for testing
  while (personNum < parsedObject.length) {
    let profileObj = parsedObject[personNum];
    let thePerson = new BioCheckPerson();
    let canUseThis = thePerson.canUse(profileObj, false, false, false, 0);
    if (canUseThis) {
      let bioString = profileObj.bio;
      let biography = new Biography(theSourceRules);
      biography.parse(bioString, thePerson, '');
      let isValid = biography.validate();

      // Put together results 
      let personResults = {
        Id: 0,
        Name: " ",
        HasSources: " ",
        BioScore: " ",
        HasStyleIssues: " ",
      }
      personResults.Id = profileObj.Id;
      personResults.Name = profileObj.Name;
      personResults.HasSources = biography.hasSources();
      personResults.BioScore = biography.getScore();
      personResults.HasStyleIssues = biography.hasStyleIssues();

      if (jsonOut) {
        jsonResults.push(personResults);
      }  else {
        let csvData = '';
        let rda = [];
        for (let key in personResults) {
          let val = personResults[key].toString();
          rda.push(val);
        }
        csvData += rda.join(",");
        csvData += "\n";
        results = results + csvData;
      }
    }
    personNum++;
  }
  if (jsonOut) {
    results = JSON.stringify(jsonResults);
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

