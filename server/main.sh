#!/bin/sh

export STREAM_KEY="$STREAM_KEY"

exec node streamingserver.js
