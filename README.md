# TranscriptKit

Simple script to automatically rewrite and format a raw transcript (or series of transcripts) into a readable Markdown-formatted document. Given a folder of textfiles, the script will process each one in order and combine them to a single file.

## Setup

* Clone the repo, cd into the folder and install the dependencies.
* Add your OpenRouter API key – the script works well with Deepseek free so you don't need credits.
* Modify the prompt template if you want.

## Usage

```
npm start <input> <output>
```
Input can be a text file or folder of textfiles, output is textfile. For example:

```
npm start transcripts/ talk-name.md
```
