#!/bin/bash

# GLOBALS
CURDIR=$(pwd)
BASEDIR=$(dirname $0)
ENV_FILEPATH=$BASEDIR/.env 
CONFIG_FILEPATH=$BASEDIR/.dockerconfig

# REGEX
alnum=[abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0-9_\.-]
alnumWithColon=$alnum+\:?$alnum+
alnumWithCommas="($alnum+)(,$alnum+)*"

# INIT
USERNAME=''
OAUTH_TOKEN=''
CHANELS_TO_JOIN=''


function parseINI(){
	local file=$1
	local regex=$2

	if [[ $(cat $file) =~ $regex ]]; then echo ${BASH_REMATCH[1]}; fi
}


function promptCredentials(){
	echo 'Twitch username to use?'
	read USERNAME
	echo 'OAuth token for the account?'
	read OAUTH_TOKEN
	echo 'What channels would you like to follow? (type "done" to finish)'
	read CHANNEL_INPUT
	while [[ $CHANNEL_INPUT != 'done' ]]
	do
		CHANNELS_TO_JOIN="$CHANNEL_INPUT,$CHANNELS_TO_JOIN"
		echo 'add another channel? (type "done" to finish)'
		read CHANNEL_INPUT
	done
}


function writeEnvFile(){
	local username=$1
	local oauth_token=$2
	local channels=$3

	echo "
TWITCH_USERNAME=$username
TWITCH_OAUTH_TOKEN=$oauth_token
TWITCH_TARGET_CHANNELS=$channels" > $ENV_FILEPATH
}


function readConfigFile(){
	USERNAME=$(parseINI $ENV_FILEPATH "TWITCH_USERNAME=($alnumWithColon)")
	OAUTH_TOKEN=$(parseINI $ENV_FILEPATH "TWITCH_OAUTH_TOKEN=($alnumWithColon)")
	CHANNELS_TO_JOIN=$(parseINI $ENV_FILEPATH "TWITCH_TARGET_CHANNELS=($alnumWithCommas)")

	echo "Parsed existing config file"
}

# MAIN
if [[ -f $ENV_FILEPATH ]]; then
	echo "do you wish to use the prexisting config (.env) file? (y/n)"
	read confirm
	
	if [[ $confirm == 'y' ]]; then
		echo 'reading'
		readConfigFile
	else
		promptCredentials
		echo 'do you wish to write these values to a local config file? (y/n)'
		read confirm

		if [[ $confirm == 'y' ]]; then
			echo "writing input to .env file"
			writeEnvFile $USERNAME $OAUTH_TOKEN $CHANNELS_TO_JOIN
		fi
	fi
fi

echo "INPUT:"
echo USERNAME $USERNAME
echo OAUTH_TOKEN $OAUTH_TOKEN
echo CHANNELS_TO_JOIN $CHANNELS_TO_JOIN

echo "Building Docker image"
$BASEDIR/docker/scripts/unix/build.sh

echo "Running Docker image"
$BASEDIR/docker/scripts/unix/run.sh -e TWITCH_USERNAME=$USERNAME \
	-e TWITCH_OAUTH_TOKEN=$OAUTH_TOKEN \
	-e TWITCH_TARGET_CHANNELS=$CHANNELS_TO_JOIN