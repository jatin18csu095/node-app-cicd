6. WebSphere Open Liberty Configuration and Support Gaps

Applicable to: COMTRAC and SPOCS applications

Problem Statement
The COMTRAC and SPOCS applications are deployed on WebSphere Open Liberty. While setting up and deploying these applications, we noticed that there was not enough clarity around Open Liberty–specific configurations, runtime expectations, and environment prerequisites. Due to the lack of clear guidance at the beginning, the team had to spend additional time understanding the setup, which led to delays and repeated troubleshooting. In many cases, we also had to rely on the platform and DevOps teams to help resolve environment-specific issues.

Solution
To avoid these issues going forward, there should be clear and application-specific guidance for deployments using WebSphere Open Liberty. This should cover key areas such as runtime configuration, supported base images, logging and monitoring standards, and any environment-specific parameters that need to be set. Having a documented reference configuration for Open Liberty, specifically for COMTRAC and SPOCS, would help reduce trial and error, speed up deployments, and lower dependency on external teams.