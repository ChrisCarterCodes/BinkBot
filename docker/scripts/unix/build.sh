#!/bin/bash

CURDIR=$(pwd)
BASEDIR=$(dirname $0)
IMAGE_NAME=$(cat $BASEDIR/../ImageName.txt)

echo Building Docker Image: $IMAGE_NAME

cd $BASEDIR/../../..
cmd="docker build -t $IMAGE_NAME $@ ."
echo "executing $cmd"
$cmd
cd $CURDIR