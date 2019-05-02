
# GLOBALS
$CURDIR=pwd
$BASEDIR=$PSScriptRoot
$ENV_FILEPATH="$BASEDIR\.env"
$ENV_FILE_EXISTS=Test-Path $ENV_FILEPATH

$USERNAME=""
$OAUTH_TOKEN=""
$CHANNELS_TO_JOIN=""

function parseINI{
    $file=$args[0]
    $prop_name=$args[1]
    $file_content=(Get-Content $file)
    "$file_content" -match "$prop_name=([\S]*)">$null
    $ret=$Matches[1]
    return $ret
}

function readConfigFile{
    $file_content=$(Get-Content $ENV_FILEPATH)

    Set-Variable -scope 1 -Name "USERNAME" -Value (parseINI $ENV_FILEPATH "TWITCH_USERNAME")
    Set-Variable -scope 1 -Name "OAUTH_TOKEN" -Value (parseINI $ENV_FILEPATH "TWITCH_OAUTH_TOKEN")
    Set-Variable -scope 1 -Name "CHANNELS_TO_JOIN" -Value (parseINI $ENV_FILEPATH "TWITCH_TARGET_CHANNELS")
}

function writeConfigFile{
    $filepath=$args[0]
    $local_username=$args[1]
    $local_oauth_token=$args[2]
    $local_target_channels=$args[3]

    echo @"
[TWITCH]
TWITCH_USERNAME=$local_username
TWITCH_OAUTH_TOKEN=$local_oauth_token
TWITCH_TARGET_CHANNELS=$local_target_channels
"@ > $filepath
}

function promptForConfig{
    Set-Variable -scope 1 -Name "USERNAME" -Value (Read-Host -Prompt 'Twitch username to use?')
    Set-Variable -scope 1 -Name "OAUTH_TOKEN" -Value (Read-Host -Prompt 'OAuth token for the account?')
    
    $TARGET_CHANNEL_LIST=''
    $CHANNEL_INPUT = Read-Host -Prompt 'What channels would you like to follow? (type "done" to finish)'
    while($CHANNEL_INPUT -ne 'done'){
        $TARGET_CHANNEL_LIST="$CHANNEL_INPUT,$TARGET_CHANNEL_LIST"
        $CHANNEL_INPUT = Read-Host -Prompt 'add another channel? (type "done" to finish)'
    }

    Set-Variable -scope 1 -Name "CHANNELS_TO_JOIN" -Value "$TARGET_CHANNEL_LIST"
    
    $confirm = Read-Host -Prompt 'do you wish to write these values to a local config file? (y/n)'
    if($confirm -eq 'y'){
        echo 'writing input to .env file'
        writeConfigFile $ENV_FILEPATH $USERNAME $OAUTH_TOKEN $CHANNELS_TO_JOIN
    }
}

# MAIN
if (Test-Path $ENV_FILEPATH){
    $confirm = Read-Host -Prompt 'do you wish to use the prexisting config (.env) file? (y/n)'
    if($confirm -eq 'y'){
        readConfigFile
    }
    else{
        promptForConfig
    }
}
else{
    promptForConfig
}

echo 'INPUTS:'
echo "USERNAME: $USERNAME"
echo "OAUTH_TOKEN: $OAUTH_TOKEN"
echo "TARGET_CHANNELS: $CHANNELS_TO_JOIN"

# DOCKER
$confirm = Read-Host -Prompt 'Would you like to run the docker image? (y/n)'
if($confirm -eq 'y'){
	echo "Building Docker image"
    cmd.exe /c "$BASEDIR\docker\scripts\windows\build.bat"

    echo "Running Docker image"
	$run_command = "$BASEDIR\docker\scripts\windows\run.bat -e TWITCH_USERNAME=$USERNAME -e TWITCH_OAUTH_TOKEN=$OAUTH_TOKEN -e TWITCH_TARGET_CHANNELS=$CHANNELS_TO_JOIN -e LOG_LEVEL=debug -e LOG_IS_LOCAL=true"
    cmd.exe /c $run_command
}
if($confirm -eq 'n'){
    echo "Running bot locally"
    cmd.exe /c "npm install"
    cmd.exe /c "node bot.js"
}