Dynatrace OneAgent Setup – SPOCS Application (AWS ECS Fargate)
	1.	Reference Documentation

The Dynatrace OneAgent setup for the SPOCS application has been implemented in accordance with the internal Confluence documentation titled:

“Deploy Dynatrace OneAgent”

All configuration and code changes described in this document strictly follow the steps and parameters outlined in the above Confluence page.
	2.	Application and Platform Details

• Application Name: SPOCS
• Platform: AWS ECS (Fargate)
• Runtime: OpenLiberty (Java)
• Environments Covered:
– DEV
– QA
	3.	Files Modified as Part of the Implementation

The following files were updated to enable Dynatrace OneAgent integration:

3.1 Environment Configuration Files
• configuration/dev.yaml
• configuration/qa.yaml

3.2 Application Manifest
• manifest.yaml

3.3 Application Container Startup Configuration
• Dockerfile
	4.	Environment Configuration Updates (DEV and QA)

As per the Confluence instructions, Dynatrace-specific configuration was added to both the DEV and QA environment configuration files.

4.1 Dynatrace Enablement

• Dynatrace: Enabled

4.2 Dynatrace Deployment Type and Tier

• DynatraceType: alpine
(Linux-based Dynatrace OneAgent, as requested by the client)

• DynatraceTier: nonprod

4.3 Dynatrace Application Properties

The following application metadata was configured using the DynatraceProps parameter.
As requested by the client, these properties were consolidated into a single-line format.

The following attributes are included:

• AppGroup
• AppName
• AppNumber
• AppType
• BU
• Environment
• Organization
• CostCenter
• PAISID

Configured format used in dev.yaml and qa.yaml:

DynatraceProps:
“AppGroup= AppName= AppNumber= AppType= BU= Environment= Organization= CostCenter= PAISID=”

All values were populated using application and organizational details provided by the client.
	5.	Manifest File Updates

As described in the Confluence step “Update manifest file to query data from config file”, the application manifest was updated to dynamically read Dynatrace configuration from the environment files.

The following entries were added or updated in manifest.yaml:

• Dynatrace: !Query Environment.Dynatrace
• DynatraceProps: !Query Environment.DynatraceProps
• DynatraceTier: !Query Environment.DynatraceTier
• DynatraceType: !Query Environment.DynatraceType

This ensures that Dynatrace configuration is applied consistently across environments during deployment.
	6.	Application Container Startup Configuration (Dockerfile)

As per the Confluence step “Configure application source code in BitBucket Repo (entrypoint.sh) to start the OneAgent”, the SPOCS Dockerfile was updated to start the OpenLiberty application with Dynatrace OneAgent attached.

The following ENTRYPOINT configuration was applied:

ENTRYPOINT
[”/opt/dynatrace/oneagent/dynatrace-agent64.sh”, “/opt/ol/wlp/bin/server”, “run”, “defaultServer”]

This configuration ensures that the Dynatrace OneAgent is injected at application startup and monitors the JVM process.
	7.	Deployment Status

The above changes were successfully deployed to the following environments:

• DEV – Deployed and running
• QA – Deployed and running
	8.	Dynatrace UI Access

Dynatrace OneAgent has been successfully deployed for the SPOCS application.

To validate application visibility, metrics, and traces within the Dynatrace UI, access permissions are required. A Dynatrace UI access request needs to be raised to enable verification.