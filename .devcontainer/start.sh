#!/bin/bash
# Start both services

# Start Actual (background)
yarn start &

# Start Authelia
authelia --config /etc/authelia/config.yml
