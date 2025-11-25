- Name: sqs-queue
  Type: deploy-pattern
  Options:
    pattern: custom-cfn
    pattern-version: latest
    stack-name: !Sub "${prefix}-${suffix}-sqs"
    template-file: "templates/sqs.yaml"
  Parameters:
    QueueName: !Sub "${foundation}-queue-${suffix}"