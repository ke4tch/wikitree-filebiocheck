# wikitree-filebiocheck Bio Check from a file
Code to check a WikiTree biography read from a file.

Reads input from a file, writes output to a file. 
Writes csv out, unless a file ending in json is specified.
Can be used in a pipe.

## Shared Code
The following are **identical** classes found in the Bio Check app, in the 
WikiTree Browser Extension, and in the WikiTree Dynamic Tree. Please do not
modify these classes to introduce items that are not available in those
contexts. The BioCheckTemplateManager is also used in the WikiTree Dynamic Tree.
* Biography.js
* BioCheckPerson.js
* SourceRules.js
* BioCheckTemplateManager

Example use:
```
node filebiocheck.js infile outfile

To report help: node filebiocheck.js -h 
   Usage: node filebiocheck.js infile outfile
          when no infile is specified input will be read from stdin
          when no outfile is specified results will be output to stdout
          when an outfile is specified, the output will be csv
          to output JSON, use an outfile name that ends with JSON

cat infile | node filebiocheck | more outfile.csv

```
