#!/bin/bash

for file in _*.json
do
    cat $file | tr -d '\n' > `echo $file | tr -d '_'`
done
