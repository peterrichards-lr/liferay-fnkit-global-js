#!/bin/sh
./gradlew clean build

ASSETS=$(find client-extensions -type f -name "*.zip" -path "*/dist/*" -mindepth 2 -maxdepth 4)

rm -rf assets
mkdir assets

for ASSET in $ASSETS; do
   mv "$ASSET" assets/
done
