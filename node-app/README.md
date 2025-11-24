  - Name: app-lambda
    Type: deploy-pattern
    Options:
      pattern: lambda-container
      pattern-version: latest
      stack-name: !Sub "${prefix}-${suffix}-lambda"
      prefix: !Query Environment.ServiceName
      suffix: !Query Environment.CE_TIER
    Parameters:
      LambdaEcrImageUrl: !Query Environment.LambdaEcrImageUrl



LambdaEcrImageUrl: "public.ecr.aws/lambda/java:latest"