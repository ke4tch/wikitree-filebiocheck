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
 *   Sources: bitmap for profile sources
 *      HAS_MODERN_SOURCES: 0x0001,
 *      HAS_TOO_OLD_SOURCES: 0x0002,
 *      HAS_PRE_1700_SOURCES: 0x0004,
 *   Issues: bitmap for profile issues
 *      see BioCheckStream.getIssues for the bitmap
 */

const sourcesBitmap = {
  HAS_MODERN_SOURCES: 0x0001,
  HAS_TOO_OLD_SOURCES: 0x0002,
  HAS_PRE_1700_SOURCES: 0x0004,
};
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
          this.push('Id;Sources;Issues\n');
        } else {
          let bioString = line.substring(line.indexOf(',') + 1);
          let thePerson = new BioCheckPerson();
          let biography = new Biography(theSourceRules);
          biography.parse(bioString, thePerson, '');
          biography.validateAllDates();
          let csvData = id + ';' + 
                      this.#getSourcesStatus(biography) + ';' + 
                      this.#getIssues(biography) + '\n';
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

  #getSourcesStatus(biography) {
    let sourcesStatus = 0;
    if (biography.hasModernSources()) {
      sourcesStatus = sourcesStatus | sourcesBitmap.HAS_MODERN_SOURCES;
    }
    if (biography.hasTooOldSources()) {
      sourcesStatus = sourcesStatus | sourcesBitmap.HAS_TOO_OLD_SOURCES;
    }
    if (biography.hasPre1700Sources()) {
      sourcesStatus = sourcesStatus | sourcesBitmap.HAS_PRE_1700_SOURCES;
    }
    return sourcesStatus;
  }
  #getIssues(biography) {
    const bioIssues = { // Issues reported via bitmask
      NO_ISSUES:                0,
      MISSING_BIO_HEADING:      0x00000001,
      MISSING_SRC_HEADING:      0x00000002, // 2
      MISSING_REF_TAG:          0x00000004, // 4
      EMPTY_BIO_SECTION:        0x00000008, // 8
      ELEMENT_OUT_OF_ORDER:     0x00000010, // 16
      MULTIPLE_BIO_HEADING:     0x00000020, // 32
      MULTIPLE_SRC_HEADING:     0x00000040, // 64
      MULTIPLE_REF_TAG:         0x00000080, // 128
      REF_AFTER_REFERENCES:     0x00000100, // 256
      MULTIPLE_REF_NAME:        0x00000200, // 512
      REF_MISSING_CITATION:     0x00000400, // 1024
      INCOMPLETE_DNA_CONF:      0x00000800, // 2048
      HORIZ_RULE_BEFORE_BIO:    0x00001000, // 4096
      SPAN_NO_ENDING_SPAN:      0x00002000, // 8192
      ENDLESS_COMMENT:          0x00004000, // 16384
      NON_RECOMMENDED_HTML:     0x00008000, // 32768
      HAS_EMAIL:                0x00010000, // 65536
      TOO_MANY_STICKERS:        0x00020000, // 131072
      NOTABILITY_HAS_REF:       0x00040000, // 262144
      REF_WITHOUT_END:          0x00080000, // 524288
      UNKNOWN_SECTION_HEADING:  0x00100000, // 1048576
      MARKED_HAS_SOURCES:       0x00200000, // 2097152
      DNA_MATCH_TOO_DISTANT:    0x00400000, // 4194304
      HAS_UNAPPROVED_TEMPLATE:  0x00800000, // 8388608
      HAS_PATERNAL_DNA_CONF:    0x01000000, // 16777216
      HAS_MATERNAL_DNA_CONF:    0x02000000, // 33554432
    };
    let issues = bioIssues.NO_ISSUES;
    if (biography.isMissingBiographyHeading()) {
      issues = issues | bioIssues.MISSING_BIO_HEADING;
    }
    if (biography.isMissingSourcesHeading()) {
      issues = issues | bioIssues.MISSING_SRC_HEADING;
    }
    if (biography.isMissingReferencesTag()) {
      issues = issues | bioIssues.MISSING_REF_TAG;
    }
    if (biography.hasHeadingWithNoLinesFollowing()) {
      issues = issues | bioIssues.EMPTY_BIO_SECTION;
    }
    if (biography.hasElementNotInProperOrder()) {
      issues = issues | bioIssues.ELEMENT_OUT_OF_ORDER;
    }
    if (biography.hasMultipleBioHeadings()) {
      issues = issues | bioIssues.MULTIPLE_BIO_HEADING;
    }
    if (biography.hasMultipleSourceHeadings()) {
      issues = issues | bioIssues.MULTIPLE_SRC_HEADING;
    }
    if (biography.hasMultipleReferencesTags()) {
      issues = issues | bioIssues.MULTIPLE_REF_TAG;
    }
    if (biography.hasRefAfterReferences()) {
      issues = issues | bioIssues.REF_AFTER_REFERENCES;
    }
    if (biography.hasMultipleRefName()) {
      issues = issues | bioIssues.MULTIPLE_REF_NAME;
    }
    if (biography.hasRefMissingCitation()) {
      issues = issues | bioIssues.REF_MISSING_CITATION;
    }
    if (biography.hasIncompleteDNAConfirmation()) {
      issues = issues | bioIssues.INCOMPLETE_DNA_CONF;
    }
    if (biography.hasHorizontalRuleBeforeBio()) {
      issues = issues | bioIssues.HORIZ_RULE_BEFORE_BIO;
    }
    if (biography.hasSpanWithoutEndingSpan()) {
      issues = issues | bioIssues.SPAN_NO_ENDING_SPAN;
    }
    if (biography.hasEndlessComment()) {
      issues = issues | bioIssues.ENDLESS_COMMENT;
    }
    if (biography.hasNonRecommendedHtml()) {
      issues = issues | bioIssues.NON_RECOMMENDED_HTML;
    }
    if (biography.hasEmail()) {
      issues = issues | bioIssues.HAS_EMAIL;
    }
    if (biography.hasTooManyStickers()) {
      issues = issues | bioIssues.TOO_MANY_STICKERS;
    }
    if (biography.notabilityHasRef()) {
      issues = issues | bioIssues.NOTABILITY_HAS_REF;
    }
    if (biography.hasRefWithoutEnd()) {
      issues = issues | bioIssues.REF_WITHOUT_END;
    }
    if (biography.hasUnknownSection()) {
      issues = issues | bioIssues.UNKNOWN_SECTION_HEADING;
    }
    if (biography.isMarkedAndHasSources()) {
      issues = issues | bioIssues.MARKED_HAS_SOURCES;
    }
    if (biography.isDnaMatchTooDistant()) {
      issues = issues | bioIssues.DNA_MATCH_TOO_DISTANT;
    }
    if (biography.hasTemplateNotAppoved()) {
      issues = issues | bioIssues.HAS_UNAPPROVED_TEMPLATE;
    }
    if (biography.hasPaternalDnaConf()) {
      issues = issues | bioIssues.HAS_PATERNAL_DNA_CONF;
    }
    if (biography.hasMaternalDnaConf()) {
      issues = issues | bioIssues.HAS_MATERNAL_DNA_CONF;
    }
    return issues;
  }
}

