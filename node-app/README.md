DevOps Issues Faced During Infrastructure Provisioning

This document outlines the key DevOps challenges encountered during infrastructure provisioning, along with the corresponding solutions or recommended approaches. Application-specific applicability has been clarified wherever relevant.

⸻

1. WizScan Policies

Applicable to: All applications (including FII)

Problem Statement

We encountered an issue with WizScan security policies that restrict the use of the keyword “password” in GitHub repositories. This limitation also affects how secrets are created using AWS SSM and CloudFormation templates, as the keyword password cannot be used as a secret key. However, while configuring source and target endpoints, a default password field is often required.

Solution

To address this, secrets were created in AWS Secrets Manager using an alternate key name instead of password. The source and target endpoint stacks were then deployed directly through the AWS CloudFormation console. This approach allowed the configuration to proceed successfully while remaining compliant with WizScan security policies.

⸻

2. Docker Windows Container Permissions

Applicable to: QTS (IIS Windows container application)

Problem Statement

Admin-level permissions are required to configure Docker Desktop for Windows containers. Without these permissions, Docker Desktop cannot be set up correctly for Windows-based containers.

Solution

An admin access request needs to be raised to enable Docker Desktop configuration for Windows containers. Additionally, the user must be added to the Docker Users group to allow proper sign-in and usage of Docker Desktop.

⸻

3. Docker Volume Creation Issues

Applicable to: QTS (IIS Windows container application)

Problem Statement

Docker volume creation requires elevated privileges, which are not available by default. As a result, the team is dependent on the admin team to create the required Docker volumes.

Solution

A request must be raised with the admin team to create the necessary Docker volumes. Providing predefined volume names and paths helps ensure consistent configuration across environments.

⸻

4. TCP Connection Error While Pushing Image to ECR

Applicable to: Container-based applications (primarily QTS)

Problem Statement

While pushing container images to Amazon ECR, a TCP connection error occurred, preventing the image from being pushed successfully.

Solution

The issue was resolved by adding the required ECR permissions to the developer IAM role and passing the correct AWS profile parameters in the command. After these updates, the image push to ECR was successful.

⸻

5. Docker Defaulting to Linux Containers

Applicable to: QTS (Windows container-based application)

Problem Statement

By default, Docker is configured to use Linux containers. However, QTS requires Windows container support, which was not enabled initially.

Solution

Access was raised to enable Windows container mode in Docker Desktop. The required permissions were granted to ensure the environment could support Windows-based containers.

⸻

6. Unavailability of Windows Runners / Jenkins Agents

Applicable to: QTS CI/CD pipeline

Problem Statement

Windows runners for GitHub or Windows-based Jenkins agents are required to run CI/CD pipelines for Windows container applications. These runners are currently not available in the Prudential environment.

Solution

For Dev environment:
In the absence of Windows runners or Jenkins agents, the container image is pushed manually to Amazon ECR using credentials that already have the required permissions.

For higher environments:
Access is raised through CyberArk by:
	1.	Requesting time-bound access (typically 3 hours) for the required environment.
	2.	Obtaining environment credentials and configuring them locally with admin privileges.

Note: Access requests must be raised before the start of the day in EST timezone.

⸻

7. Security Scan Gates Only in Production

Applicable to: All applications

Problem Statement

Security scan gates are currently enabled only in the production environment. As a result, security issues are identified late in the deployment cycle, causing delays during production releases.

Solution

Security scan gates should also be implemented in pre-production (Stage) environments. Introducing these checks earlier would help identify and resolve issues sooner, leading to smoother and faster production deployments.

⸻

8. Dependency on Prudential Team for Elevated Access

Applicable to: All applications

Problem Statement

There is a strong dependency on the Prudential team for obtaining elevated access required for troubleshooting and configuration changes. This dependency can delay issue resolution.

Solution

A standardized process for requesting time-bound elevated access should be defined, including clear escalation paths and expected turnaround times for urgent scenarios.

⸻

9. Uncommunicated Pipeline Logic Updates

Applicable to: All applications

Problem Statement

Pipeline logic updates were made without prior communication, leading to unexpected build failures and deployment issues. These changes increased dependency on the Prudential DevOps team and impacted both infrastructure and application pipelines.

Solution

Pipeline changes should follow a defined communication process, including prior notification and change visibility. This will help teams prepare for updates and avoid sudden pipeline disruptions.

⸻

10. Lack of Early Documentation for Prupath and DevOps Console

Applicable to: All applications

Problem Statement

Documentation for the Prupath tool and DevOps console was not provided during the initial infrastructure setup phase. This resulted in knowledge gaps, setup errors, and increased dependency on individual teams for support.

Solution

Basic onboarding documentation should be shared during the initial setup phase. This documentation should cover access procedures, common workflows, troubleshooting steps, and support contacts.

⸻

11. Sudden Pipeline Code Updates by Prupath Bot

Applicable to: All applications

Problem Statement

Automated pipeline updates performed by the Prupath Bot without prior notification disrupted pipeline workflows. In one instance, the bot update removed the application build step entirely from the CI pipeline.

Solution

Automated pipeline updates should be controlled through notifications or approvals. Critical pipeline steps must be protected to prevent accidental removal, and alerts should be enabled to flag unexpected pipeline changes immediately.