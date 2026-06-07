#!/bin/bash

# TODO Default to prefix variable from .envrc if not provided as an argument
# Default prefix to 'PH' if not provided as the first argument
PREFIX="${1:-PH}"

#TODO: Empty bucket and zone

echo "Starting deletion for all CloudFormation stacks starting with prefix: '${PREFIX}'"

while true; do
    # 1. Fetch all stacks with the prefix that are NOT already deleted/deleting
    echo "Checking for active stacks matching '${PREFIX}'..."
    STACK_NAMES=$(aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE ROLLBACK_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE IMPORT_COMPLETE IMPORT_ROLLBACK_COMPLETE DELETE_FAILED \
        --query "StackSummaries[?starts_with(StackName, '${PREFIX}')].StackName" \
        --output text)

    # If no stacks are found, we are done!
    if [ -z "$STACK_NAMES" ] || [ "$STACK_NAMES" = "None" ]; then
        # Double check if any are still in the process of deleting
        DELETING_COUNT=$(aws cloudformation list-stacks \
            --stack-status-filter DELETE_IN_PROGRESS \
            --query "length(StackSummaries[?starts_with(StackName, '${PREFIX}')])" \
            --output text)

        if [ "$DELETING_COUNT" -eq 0 ]; then
            echo "Success! All stacks prefixed with '${PREFIX}' have been deleted."
            break
        else
            echo "Waiting for $DELETING_COUNT stack(s) currently in DELETE_IN_PROGRESS..."
            sleep 15
            continue
        fi
    fi

    # 2. Trigger deletion for the found stacks
    for STACK in $STACK_NAMES; do
        echo "Triggering deletion for stack: $STACK"
        aws cloudformation delete-stack --stack-name "$STACK"
    done

    # 3. Wait a bit before checking status again to avoid aggressive API throttling
    echo "Waiting 60 seconds for deletion progress..."
    sleep 60
done