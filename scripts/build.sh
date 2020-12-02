#!/bin/bash

set -e

if ! type jq &> /dev/null; then
	printf 'Missing jq build dependency\n'
	exit 1
fi

DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

clean() {
    find "$DIR/package" -mindepth 1 | grep -vP '.gitignore|.npmignore|node_modules' | sort -r | xargs -rn50 rm -r
}

build() {
    node "$DIR/node_modules/.bin/tsc" -p "$DIR/tsconfig.compile.json"
}

copyStatic() {
	local target
	for src in $(find "$DIR/src" -type f -name '*.ts' | grep -vP '/__tests__/' | sort -r); do
		target="${DIR}/package/${src##${DIR}/src/}"
		mkdir -p "$(dirname "$target")"
		cp "$src" "$target"
	done
	cp "$DIR/LICENSE" "$DIR/package/LICENSE"
	jq 'del(.devDependencies,.private,.scripts,.readme,.repository.directory)' "$DIR/package.json" > "$DIR/package/package.json"
}


clean
build
copyStatic
