#!/bin/bash
# Script to create claude-desktop branch in all worker repositories

GITHUB_DIR="/Users/mobicycle/Library/Mobile Documents/com~apple~CloudDocs/0.1.1_GitHub"

workers=(
    "acts"
    "assembler-acts"
    "assembler-scenes"
    "assembler-sequences"
    "battles"
    "beat-sheet"
    "budget"
    "characters"
    "concepts"
    "element-actions"
    "element-characters"
    "element-dialogue"
    "element-notes"
    "element-parentheticals"
    "element-slugline"
    "element-transitions"
    "elements"
    "injustices"
    "journeys"
    "metadata"
    "outline"
    "scenes"
    "schedule"
    "script"
    "sequences"
    "synopsis"
)

echo "Creating claude-desktop branch in all workers..."
echo ""

for worker in "${workers[@]}"; do
    echo "Processing $worker..."
    if [ -d "$GITHUB_DIR/$worker/.git" ]; then
        cd "$GITHUB_DIR/$worker"
        # Check if branch already exists
        if git rev-parse --verify claude-desktop >/dev/null 2>&1; then
            echo "  ✓ Branch already exists, checking out..."
            git checkout claude-desktop
        else
            echo "  ✓ Creating new branch..."
            git checkout -b claude-desktop
        fi
    else
        echo "  ✗ Not a git repository or directory not found"
    fi
    echo ""
done

echo "Done! All workers now have claude-desktop branch."
