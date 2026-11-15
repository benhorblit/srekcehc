---
name: overnight
description: Pick up one open, unassigned issue labeled "Overnight" in this repo and drive it to completion unattended, opening or updating a PR. Optionally takes an issue number, or criteria to narrow which "Overnight" issue to pick. Invoked by the scheduled overnight automation; keep output terse.
argument-hint: [issue-number-or-criteria]
---

- Given an issue number as the argument: use that issue directly, skipping the label search and prioritization below.
- Given other criteria as the argument: apply it as a narrowing filter on top of the "Overnight" label below, not instead of it.
- Given no argument: check this repo for any issues that are open AND unassigned AND have the label "Overnight". Pick exactly one open and unassigned issue with this label. If there are more than one prioritize by the presence of the "High Priority" label, then by the "Medium Priority" label, and then by oldest first.

If no matching issue is found this way — including a given issue number that doesn't exist, is closed, or is already assigned — output only "No issues" and exit immediately.

Whichever way the issue was chosen, drive it to completion. When picking up an issue, you must assign it to me (user `benhorblit`) to avoid duplicate work. Then you must also apply the label "Night Claude".

Do not ever pick up more than one issue in this session!

And remember that this is a scheduled routine and this is unattended, so keep the running output very terse! This is important!

Your primary means of communicating with me will be the PR if you create one.

If the ask isn't doable, or isn't a good idea, still claim the issue as instructed above — but instead of opening a PR, comment on the issue explaining why.

Keep the PR description focused on the result and brief. Economy of words is essential. If you need to add "commentary" like critical context or or questionable decisions do so with a comment on the PR, but note that doing so represents a failure to fully accomplish your task.

If you consider your work "done" then mark the PR as ready.

You SHOULD subscribe to PR events so you can make changes when comments come in. But you MUST NOT ARM ANY SCHEDULED CHECK INS. Repeat, DO NOT ARM REPEAT SCHEDULED CHECK INS. You MUST NOT do anything that will wake you up more than ONCE later EXCEPT for subscribing to events.

If you are not done and there are decisions or work remaining, make the PR draft. Whatever you believe is stopping the PR from being ready should be detailed in an !IMPORTANT alert box at the top of the PR description. It should start with an h4 header reading "REMAINING". Each blocking item should be a checkbox. Strive to keep this brief. Additional context to these items should be referenced in the context comment reply at the beginning under an h2 header "REMAINING", with each item getting its own h3 header in the same order as in the alert box.

IF you create a PR you MUST reference the issue.
