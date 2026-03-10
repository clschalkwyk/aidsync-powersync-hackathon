#!/bin/bash

# Configuration
BUCKET_NAME="aidsync.co.za"
REGION="af-south-1"
BUILD_DIR=".output/public"

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment to S3 bucket: ${BUCKET_NAME}...${NC}"

# Sync the build directory to S3 and delete files not in build output
aws s3 sync "$BUILD_DIR" "s3://$BUCKET_NAME" --region "$REGION" --delete

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment successful! Your app should be live at: http://${BUCKET_NAME}.s3-website.${REGION}.amazonaws.com (or your custom domain)${NC}"
else
    echo -e "Deployment failed. Please check your AWS credentials and bucket permissions."
    exit 1
fi
