Hi Garnet,

We’ve shared the requested screenshots (Dev config, Dynatrace section in manifest, and current entrypoint.sh).

SPOCS runs on Open Liberty (Java), so we’ve aligned the OneAgent startup with Liberty rather than the generic Java examples shown on Confluence. At this point, the entrypoint.sh change has not yet been rolled out to Dev, pending confirmation that this is the correct and recommended approach for Liberty on ECS Fargate.

Could you please confirm if this Liberty-based OneAgent startup is the right pattern, or if any changes are required? Once confirmed, we’ll proceed with integration and rollout.
