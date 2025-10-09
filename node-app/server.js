Perfect 👍 — here’s a ready-to-read explanation you can tell directly to your manager.
It summarizes:
	•	what the POC goal was,
	•	what you implemented and tested,
	•	what AWS services were used, and
	•	how you cleaned up everything safely.

⸻

🗣️ POC Summary – “Authentication via AWS Cognito through ALB”

Objective:
The goal of this POC was to simulate how authentication can be handled on AWS without relying on on-prem Ping authentication.
Instead, we tested AWS-native authentication using Amazon Cognito integrated with an Application Load Balancer (ALB) that forwards traffic to an EC2 backend instance.

⸻

🔹 1️⃣ Purpose of the POC

I wanted to demonstrate how we can:
	•	Replace on-prem Ping authentication with AWS Cognito-based login.
	•	Integrate authentication at the load balancer level, so that only verified users can access the backend.
	•	Use AWS managed services for scalability and security — without external identity providers like Azure or Ping.

This approach is useful for future application migrations where we move workloads from on-prem to AWS and want to implement AWS-native identity management.

⸻

🔹 2️⃣ Steps I Performed

Step 1: Created Cognito User Pool
	•	Set up a user pool named gift-poc-userpool.
	•	Added sign-in options using username/email.
	•	Enabled hosted login page to test user authentication.
	•	Generated an App Client (gift-poc-userpool) to connect Cognito with the backend.

Step 2: Launched EC2 Instance
	•	Created an Amazon Linux 2023 EC2 instance (gift-poc-backend).
	•	Installed a simple Python web app (header_server.py) that returns headers.
	•	Verified the app locally using curl http://127.0.0.1.

Step 3: Created Security Group
	•	Opened port 80 (HTTP) and port 22 (SSH).
	•	Associated this group with the EC2 instance to allow access from ALB.

Step 4: Created Target Group
	•	Registered the EC2 instance under a target group (gift-poc-backend).
	•	Configured health checks on port 80.

Step 5: Created Application Load Balancer (ALB)
	•	Created an Application Load Balancer named gift-poc-alb.
	•	Attached the target group created earlier.
	•	Initially configured HTTP listener (port 80) to verify connectivity.

Step 6: Configured HTTPS (Secure Traffic)
	•	Created and imported a self-signed certificate in AWS Certificate Manager (ACM).
	•	Attached this certificate to ALB (port 443) to support HTTPS traffic.

Step 7: Integrated Cognito Authentication
	•	Updated ALB listener rules to use Cognito authentication.
	•	Provided Cognito User Pool ARN and App Client ID.
	•	Updated callback URLs in Cognito to redirect through ALB after successful login.
	•	Verified that login requests are redirected to Cognito Hosted UI, and once authenticated, the ALB forwards traffic to EC2.

⸻

🔹 3️⃣ Testing & Validation
	•	Accessed the ALB DNS URL in browser.
	•	Confirmed that unauthenticated requests were redirected to Cognito login.
	•	After login, the backend returned HTTP headers with Cognito OIDC tokens (x-amzn-oidc-data).
	•	Verified secure access flow:
User → Cognito Login → ALB (Auth Layer) → EC2 App

⸻

🔹 4️⃣ Cleanup After POC

After completing the demo and testing successfully, I cleaned up all resources to avoid any cost:
	1.	Deleted Application Load Balancer
	2.	Deleted Target Group
	3.	Terminated EC2 Instance
	4.	Deleted Custom Security Group
	5.	Deleted ACM Certificate
	6.	Deleted Cognito User Pool
	7.	Verified in Billing Dashboard that no resources were left running.

⸻

🔹 5️⃣ Key Takeaways
	•	AWS Cognito + ALB can replace on-prem Ping or AD authentication for migrated apps.
	•	Authentication can be handled at the ALB layer — no need to change backend app code.
	•	The same approach can be extended later to use Azure AD via OIDC or corporate SSO for production.
	•	This POC establishes a working baseline for future authentication integrations during cloud migration.

⸻

🧾 One-line Summary (for meetings):

“I implemented a small POC to validate authentication via AWS Cognito integrated with an Application Load Balancer and EC2 backend. The setup demonstrates secure user login at the ALB layer, replacing the need for on-prem Ping authentication. After testing, all resources were deleted to avoid cost.”

⸻

Would you like me to create this as a Word or Excel document (formatted and ready to send to your manager)?