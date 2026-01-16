Dynatrace OneAgent Verification – AWS ECS Fargate

AWS ECS Validation

(Paste ECS Task / Environment Variables screenshot here)
	•	Verified Dynatrace OneAgent sidecar container in ECS Task Definition
	•	Dynatrace container status is RUNNING
	•	Dynatrace-specific environment variables are present
	•	OneAgent volume/path mounted successfully in the task
	•	No OneAgent-related errors in ECS Events

⸻

Dynatrace UI Validation

(Paste Dynatrace UI screenshot here)
	•	ECS task/host is visible in Dynatrace Hosts
	•	Application/services detected automatically
	•	Confirms successful OneAgent injection and monitoring
