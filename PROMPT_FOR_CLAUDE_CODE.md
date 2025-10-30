# Task: Create `claude-desktop` Branch in All Worker Repositories

## Context
I have 26 Cloudflare Workers for the ALLY screenplay project, each in its own Git repository. I need to create a `claude-desktop` branch in all of them to follow our development workflow.

## Repository Location
```
/Users/mobicycle/Library/Mobile Documents/com~apple~CloudDocs/0.1.1_GitHub/
```

## Workers List (26 repositories)
1. acts
2. assembler-acts
3. assembler-scenes
4. assembler-sequences
5. battles
6. beat-sheet
7. budget
8. characters
9. concepts
10. element-actions
11. element-characters
12. element-dialogue
13. element-notes
14. element-parentheticals
15. element-slugline
16. element-transitions
17. elements
18. injustices
19. journeys
20. metadata
21. outline
22. scenes
23. schedule
24. script
25. sequences
26. synopsis

## Task
Create a `claude-desktop` branch in each of these 26 worker repositories.

For each repository:
1. Navigate to the directory
2. Check if `claude-desktop` branch already exists
3. If it doesn't exist, create it from the current branch (likely `main`)
4. If it does exist, just checkout to it

## Success Criteria
- All 26 repositories have a `claude-desktop` branch
- No errors or conflicts
- Provide a summary of what was done in each repo

## Notes
- These are separate Git repositories, not a monorepo
- Each worker is in its own directory
- The path contains spaces ("Mobile Documents" and "com~apple~CloudDocs"), so handle path escaping properly

Please create the branches and report back on the status of each repository.
