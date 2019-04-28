#!/bin/bash
CURDIR=$(pwd)
BASEDIR=$(dirname $0)
ENV_FILEPATH=$BASEDIR/.env 

USERNAME=''
OAUTH_TOKEN=''
CHANELS_TO_JOIN=''

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

	echo "[TWITCH]
TWITCH_USERNAME=$username
TWITCH_OAUTH_TOKEN=$oauth_token
TWITCH_TARGET_CHANNELS=$channels" > .env
}

if [[ ! -f $ENV_FILEPATH ]]; then

	promptCredentials
	
	echo "INPUT:"
	echo USERNAME $USERNAME
	echo OAUTH_TOKEN $OAUTH_TOKEN
	echo CHANNELS_TO_JOIN $CHANNELS_TO_JOIN

	echo "writing input to .env file"
	writeEnvFile $USERNAME $OAUTH_TOKEN $CHANNELS_TO_JOIN
fi


echo "Building Docker image"
$BASEDIR/docker/scripts/unix/build.sh

echo "Running Docker image"
$BASEDIR/docker/scripts/unix/run.sh