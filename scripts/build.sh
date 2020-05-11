#!/bin/bash

set -e

DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

clean() {
    find "$DIR/package" -mindepth 1 | grep -vP '.gitignore|.npmignore|node_modules' | sort -r | xargs -rn50 rm -r
}

compile() {
    node "$DIR/node_modules/.bin/tsc" -p "$DIR/tsconfig.compile.json"
}

clean "$@"
compile "$@"
