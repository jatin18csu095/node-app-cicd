[INFO] XXX[3] - JDBQuestionedActivityDAO.findAllQuestionedActivities_questionedActivtyMap.size:29
[INFO] XXX[3] - JDBQuestionedActivityDAO.findAllQuestionedActivities_questionedActivtyMap.size:29
[INFO] [ERROR ] SRVE0777E: Exception thrown by application class 'javax.faces.webapp.FacesServlet.service:236'
[INFO] javax.servlet.ServletException: Failed to parse the expression 
      [#{pc_CreateCase.case.caseFieldRules.caseNumberApplicable}]
[INFO]    at javax.faces.webapp.FacesServlet.service(FacesServlet.java:236)
[INFO]    at [internal classes]
[INFO]    at com.prudential.compliance.spocs.web.filter.NoCacheFilter.doFilter(NoCacheFilter.java:28)
[INFO]    at com.ibm.ws.webcontainer.filter.FilterInstanceWrapper.doFilter(FilterInstanceWrapper.java:203)
[INFO]    at [internal classes]
[INFO]    at com.prudential.compliance.spocs.web.filter.LogonFilter.doFilter(LogonFilter.java:168)
[INFO]    at com.ibm.ws.webcontainer.filter.FilterInstanceWrapper.doFilter(FilterInstanceWrapper.java:203)
[INFO]    at [internal classes]
[INFO] Caused by: javax.el.ELException: Failed to parse the expression 
      [#{pc_CreateCase.case.caseFieldRules.caseNumberApplicable}]
[INFO]    at org.apache.el.lang.ExpressionBuilder.createNodeInternal(ExpressionBuilder.java:143)
[INFO]    ... 7 more
[INFO] Caused by: javax.el.ELException: The identifier [case] is not a valid Java identifier as required by 
      section 1.19 of the EL specification (Identifier ::= Java language identifier). 
      This check can be disabled by setting the system property org.apache.el.parser.SKIP_IDENTIFIER_CHECK to true.
[INFO]    at org.apache.el.parser.AstDotSuffix.setImage(AstDotSuffix.java:45)
[INFO]    ... 7 more
[INFO]
Note: Some input files use or override a deprecated API