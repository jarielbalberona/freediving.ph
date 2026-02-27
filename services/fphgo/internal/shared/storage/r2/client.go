package r2

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"strings"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type Config struct {
	AccountID       string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	Region          string
}

type Client struct {
	bucketName string
	s3Client   *s3.Client
}

func New(ctx context.Context, cfg Config) (*Client, error) {
	if strings.TrimSpace(cfg.AccountID) == "" {
		return nil, fmt.Errorf("r2 account id is required")
	}
	if strings.TrimSpace(cfg.AccessKeyID) == "" {
		return nil, fmt.Errorf("r2 access key id is required")
	}
	if strings.TrimSpace(cfg.SecretAccessKey) == "" {
		return nil, fmt.Errorf("r2 secret access key is required")
	}
	if strings.TrimSpace(cfg.BucketName) == "" {
		return nil, fmt.Errorf("r2 bucket name is required")
	}
	region := cfg.Region
	if strings.TrimSpace(region) == "" {
		region = "auto"
	}

	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.AccountID)
	parsed, err := url.Parse(endpoint)
	if err != nil {
		return nil, fmt.Errorf("parse r2 endpoint: %w", err)
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(
		ctx,
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true
		base := parsed.String()
		o.BaseEndpoint = &base
	})

	return &Client{bucketName: cfg.BucketName, s3Client: client}, nil
}

func (c *Client) BucketName() string {
	return c.bucketName
}

func (c *Client) PutObject(ctx context.Context, bucketName, objectKey, contentType string, body io.Reader, sizeBytes int64) error {
	if strings.TrimSpace(bucketName) == "" {
		bucketName = c.bucketName
	}
	_, err := c.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        &bucketName,
		Key:           &objectKey,
		Body:          body,
		ContentType:   &contentType,
		ContentLength: &sizeBytes,
	})
	if err != nil {
		return fmt.Errorf("put object %s: %w", objectKey, err)
	}
	return nil
}

func (c *Client) DeleteObject(ctx context.Context, bucketName, objectKey string) error {
	if strings.TrimSpace(bucketName) == "" {
		bucketName = c.bucketName
	}
	_, err := c.s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: &bucketName,
		Key:    &objectKey,
	})
	if err != nil {
		return fmt.Errorf("delete object %s: %w", objectKey, err)
	}
	return nil
}
