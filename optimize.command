#!/bin/sh

# optimization scripts here to make loading a lil faster on l2d files

# minifies json to one line
for f in $(find images/l2d/ -name '*.json'); do jj -u -i $f -o $f; done