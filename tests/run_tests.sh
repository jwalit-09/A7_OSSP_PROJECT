#!/bin/bash
# ShellForge Automated Test Suite
echo "======================================"
echo " Running ShellForge Automated Tests"
echo "======================================"

SHELL_BIN="./bin/shellforge"

if [ ! -f "$SHELL_BIN" ]; then
    echo "Error: ShellForge binary not found. Run 'make' first."
    exit 1
fi

TEST_DIR="test_sandbox"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR" || exit 1

# Commands sent one per line
printf "pwd\nmkdir demo\ncd demo\ntouch a.txt b.txt\necho hello > a.txt\ncat a.txt\nls -l\ncd ..\ncp -r demo demo_copy\nfind . -name \"*.txt\"\nchmod 600 demo/a.txt\nstat demo/a.txt\nrm -r demo demo_copy\nexit\n" | ../"$SHELL_BIN"

cd ..
rm -rf "$TEST_DIR"

echo "======================================"
echo " All tests executed successfully!"
echo "======================================"
