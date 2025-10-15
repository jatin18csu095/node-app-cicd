AWSTemplateFormatVersion: 2010-09-09
Description: >
  CloudFormation template to create AWS DMS Target Endpoint for S3
  Environment: GIFT Archive | Target: S3 | Region: us-east-1

Metadata:
  AWS::CloudFormation::Interface:
    ParameterGroups:
      - Label:
          default: "Common Parameters for Tags"
        Parameters:
          - ApplicationIDName
          - CostCenter
          - RSMs
          - BusinessUnit
          - DataClassification
          - Tier
      - Label:
          default: "Target Endpoint Parameters"
        Parameters:
          - TgtEndpointIdentifier
          - BucketName
          - BucketFolder
          - DataFormat
          - CompressionType
          - EnableStatistics
          - DatePartitionEnabled
          - CdcPath
          - DMSRoleArn
          - KmsKeyArn
    ParameterLabels:
      ApplicationIDName: { default: "Application Name" }
      CostCenter:       { default: "Cost Center" }
      RSMs:             { default: "RSM IDs" }
      BusinessUnit:     { default: "Business Unit" }
      DataClassification: { default: "Data Classification" }
      Tier:             { default: "Environment Tier" }
      TgtEndpointIdentifier: { default: "Endpoint Identifier" }
      BucketName:       { default: "S3 Bucket Name" }
      BucketFolder:     { default: "S3 Folder Prefix" }
      DataFormat:       { default: "Data Format" }
      CompressionType:  { default: "Compression Type" }
      EnableStatistics: { default: "Enable Statistics" }
      DatePartitionEnabled: { default: "Date Partitioning" }
      CdcPath:          { default: "CDC Folder Path" }
      DMSRoleArn:       { default: "DMS IAM Role ARN" }
      KmsKeyArn:        { default: "KMS Key ARN (optional)" }

Parameters:
  # ============= Tagging Parameters =============
  ApplicationIDName:
    Type: String
    Default: "GIFT-ARCHIVE"
    Description: The name for the application.

  CostCenter:
    Type: String
    Default: "123456"
    AllowedPattern: '^[1-9][0-9]{5}$'
    Description: Cost Center for this resource.

  RSMs:
    Type: String
    Default: "sthakur"
    Description: Responsible RSM IDs.

  BusinessUnit:
    Type: String
    Default: "Advisory"
    Description: The business unit name.

  DataClassification:
    Type: String
    Default: "Internal"
    AllowedValues: [Internal, Public, Restricted, Confidential]
    Description: Classification of the data.

  Tier:
    Type: String
    Default: "dev"
    AllowedValues: [np, dev, qa, stage, prod]
    Description: Deployment environment.

  # ============= Target S3 Endpoint Parameters =============
  TgtEndpointIdentifier:
    Type: String
    Default: "gift-archive-s3-target-dev"
    Description: Unique identifier for the DMS target endpoint.

  BucketName:
    Type: String
    Default: "gift-archive-bucket"
    Description: S3 bucket where data will be written.

  BucketFolder:
    Type: String
    Default: "dms/target/"
    Description: Folder path (prefix) inside the S3 bucket.

  DataFormat:
    Type: String
    Default: "parquet"
    AllowedValues: [csv, parquet]
    Description: Output format for the migrated data.

  CompressionType:
    Type: String
    Default: "NONE"
    AllowedValues: [NONE, GZIP]
    Description: Compression type for S3 objects.

  EnableStatistics:
    Type: String
    Default: "true"
    AllowedValues: ["true", "false"]
    Description: Whether to enable statistics files.

  DatePartitionEnabled:
    Type: String
    Default: "true"
    AllowedValues: ["true", "false"]
    Description: Enable partitioning by date for Athena queries.

  CdcPath:
    Type: String
    Default: "cdc/"
    Description: Folder inside S3 for change data capture (CDC) files.

  DMSRoleArn:
    Type: String
    Default: ""
    Description: IAM role ARN that DMS assumes to write to S3 (ServiceAccessRoleArn).

  KmsKeyArn:
    Type: String
    Default: ""
    Description: Optional KMS Key ARN if S3 bucket uses SSE-KMS.

Conditions:
  UseKms: !Not [!Equals [!Ref KmsKeyArn, ""]]

Resources:
  DmsS3TargetEndpoint:
    Type: AWS::DMS::Endpoint
    Properties:
      EndpointIdentifier: !Ref TgtEndpointIdentifier
      EndpointType: target
      EngineName: s3
      KmsKeyId: !If [UseKms, !Ref KmsKeyArn, !Ref "AWS::NoValue"]
      S3Settings:
        ServiceAccessRoleArn: !Ref DMSRoleArn
        BucketName: !Ref BucketName
        BucketFolder: !Ref BucketFolder
        DataFormat: !Ref DataFormat
        CompressionType: !Ref CompressionType
        EnableStatistics: !Ref EnableStatistics
        DatePartitionEnabled: !Ref DatePartitionEnabled
        CdcPath: !Ref CdcPath
        EncodingType: "utf-8"
        ParquetVersion: "parquet-2-0"
        TimestampColumnName: "dms_ts"
      Tags:
        - Key: ApplicationIDName
          Value: !Ref ApplicationIDName
        - Key: CostCenter
          Value: !Ref CostCenter
        - Key: RSMs
          Value: !Ref RSMs
        - Key: BusinessUnit
          Value: !Ref BusinessUnit
        - Key: DataClassification
          Value: !Ref DataClassification
        - Key: Tier
          Value: !Ref Tier

Outputs:
  TargetEndpointArn:
    Description: ARN of the DMS Target S3 Endpoint
    Value: !Ref DmsS3TargetEndpoint

  BucketNameOutput:
    Description: Name of the target S3 bucket
    Value: !Ref BucketName