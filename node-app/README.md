Hi Team,

We need assistance with enabling Dynatrace OneAgent on AWS ECS Fargate for a Windows (.NET-based) workload.

So far, all Dynatrace integrations we have implemented on ECS Fargate were for Linux / Alpine-based, Java workloads, using the standard deployment patterns. Those setups are working successfully.

This is our first Windows-based ECS Fargate workload, and the existing Dynatrace Fargate patterns appear to be Linux-specific. When we attempt to reuse them, the ECS deployment fails during task startup / OneAgent initialization.

Could you please help with:
	•	Whether a standard Dynatrace OneAgent pattern exists for ECS Fargate Windows
	•	If not, what changes are required (task definition, image URI, startup configuration, volumes/mounts, etc.)
	•	The approved Dynatrace OneAgent Windows image/repository to be used

Let us know if you need logs, ECS events, or configuration details from our side.