#!/bin/bash
# Script to manually clean up old ECR images
# Usage: ./cleanup-ecr-images.sh <repository-name> <keep-count>
# Example: ./cleanup-ecr-images.sh full-stack-template/auth-service 3

REPO_NAME=${1:-"full-stack-template/auth-service"}
KEEP_COUNT=${2:-3}
AWS_REGION=${AWS_REGION:-"us-east-1"}
ACCOUNT_ID=${ACCOUNT_ID:-"914979267695"}

echo "Cleaning up old images in repository: $REPO_NAME"
echo "Keeping the latest $KEEP_COUNT images (excluding 'latest' tag)"
echo ""

# Get all image tags except 'latest', sorted by creation date (newest first)
IMAGES=$(aws ecr describe-images \
  --repository-name "$REPO_NAME" \
  --region "$AWS_REGION" \
  --query "sort_by(imageDetails[?imageTags[?@ != 'latest']], &imagePushedAt)[-$KEEP_COUNT:].imageDigest" \
  --output text)

if [ -z "$IMAGES" ]; then
  echo "No old images to delete (or all images are tagged as 'latest')"
  exit 0
fi

echo "Images to be deleted:"
aws ecr describe-images \
  --repository-name "$REPO_NAME" \
  --region "$AWS_REGION" \
  --image-ids imageDigest=$IMAGES \
  --query "imageDetails[*].[imageTags[0], imagePushedAt, imageSizeInBytes]" \
  --output table

echo ""
read -p "Do you want to delete these images? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
  echo "Deleting images..."
  for DIGEST in $IMAGES; do
    aws ecr batch-delete-image \
      --repository-name "$REPO_NAME" \
      --region "$AWS_REGION" \
      --image-ids imageDigest=$DIGEST
    echo "Deleted: $DIGEST"
  done
  echo "Cleanup complete!"
else
  echo "Cancelled."
fi

