- Name: sqs-queue
  Type: deploy-pattern
  Options:
    pattern: custom-cfn
    pattern-version: latest
    stack-name: !Sub "${prefix}-${suffix}-sqs"
    template-file: "templates/sqs.yaml"
  Parameters:
    prefix: !Query Environment.ServiceName
    suffix: !Query Environment.CE_TIER
    foundation: !Query Environment.FoundationName
    QueueName: !Sub "${foundation}-queue-${suffix}"