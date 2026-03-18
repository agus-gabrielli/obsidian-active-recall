# AI Active Recall

AI Active Recall turns your notes into a self-test. Pick a folder, and the plugin reads your notes and writes a set of questions and answers into a new file inside that folder. Open that file to quiz yourself and reinforce what you've written.

## Installation

1. Open Obsidian and go to **Settings > Community Plugins**.
2. Turn off Safe Mode if prompted.
3. Click **Browse** and search for **AI Active Recall**.
4. Click **Install**, then **Enable**.
5. Go to **Settings > AI Active Recall** to open Plugin Settings.
6. Paste your OpenAI API key into the API key field. If you don't have one, get it at [platform.openai.com](https://platform.openai.com).

## How to use

There are three ways to generate a self-test for a folder.

**Command palette**

Press `Cmd+P` (Mac) or `Ctrl+P` (Windows/Linux) to open the command palette. Type **Generate Self-Test for Current Folder** and press Enter. This runs on the folder that contains the note you currently have open.

**Context menu**

In the file explorer on the left, right-click any folder to open the context menu. Select **Generate Self-Test**. This lets you target any folder directly without opening a note first.

**Sidebar panel**

Open the command palette and run **Open Active Recall Panel**. The sidebar panel lists all folders in your vault that have notes. Each folder shows a Generate button - or a Regenerate button if a self-test already exists. Click it to run the self-test for that folder.

## Why active recall works

Re-reading your notes feels productive but produces weak retention. Roediger and Karpicke (2006) showed that retrieving information from memory - the testing effect - strengthens long-term retention far more than restudying the same material. Students who practiced retrieval remembered significantly more after one week than those who re-read. Dunlosky et al. (2013) reviewed ten common learning techniques and rated practice testing the highest in utility; highlighting and re-reading ranked at the bottom. Karpicke and Blunt (2011) found that retrieval practice outperformed elaborative concept mapping for meaningful learning.

Each part of the self-test file is designed around this research. The concept map gives you a structural overview of the topics and relationships you are about to be tested on, so your thinking is oriented before retrieval begins. Questions are ordered from simple to complex, building retrieval from foundational concepts upward. Hints situate you in the right context without revealing the answer - they preserve the retrieval effort that makes the practice effective. Reference answers let you verify your recall and trace back to original notes for deeper review.

## How is this different from LLM Test Generator?

LLM Test Generator (Competence), by Aldo George, is another Obsidian plugin that generates questions from your notes. That plugin asks you to type full answers into text boxes, then submits them to an AI for grading and scoring.

AI Active Recall works differently. Questions are meant to be answered out loud or in your head - zero typing, zero grading, pure retrieval practice. There are no scores, so the focus stays on recall rather than performance. The effort goes into the retrieval itself rather than into writing sentences and waiting for feedback. The self-test also includes a concept map for orientation before you begin and questions ordered from simple to complex, with hints that cue without giving the answer away.

Both plugins use a notes-to-questions approach. The difference is in what you do with those questions.
