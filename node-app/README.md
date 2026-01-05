DYNATRACE CONFIGURATION IMPLEMENTATION – SPOCS (spocsecs)

1. OVERVIEW

Dynatrace configuration has been implemented for the SPOCS (spocsecs) application deployed on AWS ECS (Fargate). The implementation follows the standard Dynatrace integration steps defined in the client-provided Confluence documentation. The configuration has been applied to the DEV and QA environments and deployed successfully. The remaining activity is to obtain Dynatrace UI access in order to validate application visibility and telemetry ingestion within Dynatrace.

2. APPLICATION AND PLATFORM DETAILS

Application Name: SPOCS (spocsecs)  
Application Runtime: Java (OpenLiberty)  
Deployment Platform: AWS ECS (Fargate)  
Environments Covered: DEV, QA  

The application runs as a containerized Java workload on ECS and uses OpenLiberty as the application server.

3. DOCUMENTATION REFERENCED

The implementation was carried out based on the Dynatrace Confluence documentation shared by the client. The documentation outlines the following high-level requirements:

- Enabling Dynatrace via application configuration
- Defining Dynatrace application metadata (tags/properties)
- Ensuring Dynatrace agent injection during application startup
- Deploying the changes via the standard CI/CD pipeline
- Requesting Dynatrace UI access for post-deployment validation

All configuration and code changes described in this document align with the steps defined in that documentation.

4. ENVIRONMENT CONFIGURATION CHANGES

Dynatrace was enabled using environment-specific configuration files. The same configuration pattern was applied consistently across DEV and QA.

Files updated:
- configuration/dev.yaml
- configuration/qa.yaml

The following Dynatrace configuration parameters were added/updated:

- Dynatrace: Enabled  
  This enables Dynatrace instrumentation for the application.

- DynatraceTier: nonprod  
  Specifies the deployment tier for Dynatrace categorization.

- DynatraceType: linux  
  Updated as per client guidance to align with the underlying runtime.

- DynatraceProps  
  Application metadata used by Dynatrace for identification, grouping, and tagging.

DynatraceProps was defined as a single-line string as requested by the client. The format applied is as follows:

DynatraceProps:
"AppGroup=SPOCS AppName=Sales_Practices_and_Oversight_Control_System AppNumber=APM0003529 AppType=java BU=<updated_value> Environment=<dev_or_qa> Organization=<org_name> CostCenter=150170 PAISID=APM0003529"

Key points regarding DynatraceProps:
- The value is maintained as a single line.
- Business Unit (BU), Organization, and Cost Center values were updated based on client inputs.
- The Environment value is set appropriately per environment (DEV or QA).
- These properties enable correct application identification and grouping in Dynatrace.

5. DOCKERFILE UPDATE – APPLICATION STARTUP INTEGRATION

To ensure that the Dynatrace OneAgent is attached to the Java process at application startup, the application container ENTRYPOINT was updated in the Dockerfile.

File updated:
- Dockerfile

Final ENTRYPOINT configuration applied:

ENTRYPOINT ["/opt/dynatrace/oneagent/dynatrace-agent64.sh", "/opt/ol/wlp/bin/server", "run", "defaultServer"]

This configuration ensures:
- The Dynatrace OneAgent wrapper is executed before the OpenLiberty server starts.
- The Java process runs under Dynatrace instrumentation.
- No additional startup scripts (such as a separate entrypoint.sh file) are required for this setup.

6. DEPLOYMENT STATUS

The updated configuration and Dockerfile changes were deployed via the standard CI/CD pipeline.

Deployment status:
- DEV environment: Deployment completed successfully.
- QA environment: Deployment completed successfully using the same configuration and startup pattern.

7. VALIDATION PERFORMED

Post-deployment validation was performed using the AWS ECS console:

- New task definitions were created successfully following deployment.
- Application containers are running as expected after deployment.
- Dynatrace agent injection is applied at container startup based on the configured ENTRYPOINT and environment variables.

Further validation within the Dynatrace UI will be performed once access is available.

8. PENDING ACTIVITY

Dynatrace UI access is currently pending.

Action required:
- Raise a Dynatrace UI access request through the standard access request process.
- Once access is granted, validate application visibility, metadata (DynatraceProps), and telemetry ingestion within the Dynatrace platform.

9. FINAL LIST OF MODIFIED FILES

- configuration/dev.yaml
- configuration/qa.yaml
- Dockerfile