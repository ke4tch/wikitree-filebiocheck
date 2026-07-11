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

//import { BioCheckTemplateManager } from "./BioCheckTemplateManager.js";
import { theSourceRules } from "./SourceRules.js";
import { BioCheckPerson } from "./BioCheckPerson.js";
import { Biography } from "./Biography.js";
import { Transform } from 'node:stream';


/* 
 * a Transform to check profiles from a file, used in a stream
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

let profileCount = 0;

export class BioCheckStream extends Transform {
  constructor(options) {
    super(options);
    this.buffer = '';
  }
  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\r\n');

    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop();

    // Check each complete line and push downstream
    lines.forEach(line => {
      if (line.trim()) {
        let id = line.substring(0, line.indexOf(','));
        if (id == 'Id') {
          this.push('Id,HasStyleIssues,HasModernSources,HasTooOldSources,HasPre1700Sources\n');
        } else {
          let bioString = line.substring(line.indexOf(',') + 1);
          let thePerson = new BioCheckPerson();
          let biography = new Biography(theSourceRules);
          biography.parse(bioString, thePerson, '');
          biography.validateAllDates();
          let csvData = id + ';' + 
                      Number(biography.hasStyleIssues()) + ';' +
                      Number(biography.hasModernSources()) + ';' + 
                      Number(biography.hasTooOldSources()) + ';' +
                      Number(biography.hasPre1700Sources()) + '\n';
          this.push(csvData);
          profileCount++;
        }
      }
    });
    callback();
  }
  _flush(callback) {
    // Handle any remaining data in the buffer
    if (this.buffer.trim()) {
      this.push(this.buffer);
    }
    callback();
  }
  getProfileCount() {
    return profileCount;
  } 
}

