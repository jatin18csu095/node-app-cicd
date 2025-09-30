AWS MGN helps to lift-and-shift servers from on-premises (or other clouds) into AWS by continuously replicating them into a staging area. Once ready, we can launch test instances and finally perform a cutover with minimal downtime. For demo purposes, I simulated an on-prem server using an EC2 instance and migrated it to AWS using MGN.

⸻

Demo Steps
	1.	Prepare Source Server – Launched a Windows/Linux EC2 to act as my on-premises server.
	2.	Enable MGN – Opened Application Migration Service in AWS Console and selected Add server.
	3.	Create IAM User – Created an IAM user with required MGN policies and generated access keys.
	4.	Install Replication Agent – Downloaded the MGN replication agent on the source EC2 and installed it using the access keys.
	5.	Verify Replication – Source server appeared in MGN console; replication status changed to Ready for Testing.
	6.	Launch Test Instance – Created a test EC2 instance to verify migration worked.
	7.	Cutover Migration – Performed cutover to launch the final migrated instance as production.