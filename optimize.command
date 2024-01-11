#!/bin/sh

# optimization scripts here to make loading a lil faster on l2d files

# minifies json to one line
for f in $(find images/l2d/ -name '*.json'); do jj -u -i $f -o $f; done

# resizes images in the static folder
magick mogrify -resize 256x256\> images/static/SmallFish_*.png
magick mogrify -resize 256x256\> images/static/MediumFish_*.png
magick mogrify -resize 512x512\> images/static/BigFish_*.png