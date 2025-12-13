You are fixing a JSF 2.x Facelets migration of Offices.jsp → Offices.xhtml for Open Liberty.

IMPORTANT CONTEXT:
- This file was auto-migrated earlier and partially corrected.
- The page must be a PURE JSF/Facelets XHTML file.
- NO JSP behavior is allowed anymore.

STRICT RULES (DO NOT VIOLATE):

1) ABSOLUTELY NO JSP CODE
   - Remove and never generate:
     <% ... %>
     <%= ... %>
     JSP directives
     Any Java code inside XHTML
   - XHTML must contain ONLY JSF tags, EL expressions, HTML, and JavaScript.

2) NO JSF EL INSIDE JAVASCRIPT
   - NEVER use #{...} inside JavaScript.
   - This is INVALID and must be removed.
   - Example of WRONG code:
       function fDoAllSearch() {
           #{officesBean.search()}
       }
   - JavaScript must ONLY manipulate DOM or submit forms.

3) BACKING BEAN INVOCATION
   - All server-side actions MUST be triggered using JSF components:
       <h:commandButton action="#{officesBean.search}" />
       <h:commandButton action="#{officesBean.returnAll}" />
       <h:commandButton action="#{officesBean.addSelected}" />
       <h:commandButton action="#{officesBean.cancel}" />
   - JavaScript may only call form.submit() or click a hidden command button.

4) FORM HANDLING
   - Use:
       <h:form id="MyFrm">
   - Replace ALL HTML form submits with JSF command components.
   - Keep:
       <h:inputHidden id="ReturnAll" value="#{officesBean.returnAll}" />

5) CHECKBOX + JAVASCRIPT COMPATIBILITY (VERY IMPORTANT)
   - JavaScript uses:
       document.getElementsByName("cbxoffice")
   - Therefore:
     - DO NOT use <h:selectBooleanCheckbox> for office rows.
     - Use PLAIN HTML checkboxes inside <ui:repeat>:
         <input type="checkbox"
                name="cbxoffice"
                value="#{office}" />
   - This is required so existing JS functions continue to work.

6) JAVASCRIPT PLACEMENT
   - All inline JavaScript MUST be inside:
       <h:outputScript target="head">
           //<![CDATA[
           ... JS code ...
           //]]>
       </h:outputScript>
   - DO NOT place JS directly inside <script> tags.
   - DO NOT call JSF beans from JS.

7) PAGE STRUCTURE
   - Keep existing table-based layout and indentation as-is.
   - Do NOT refactor layout or UI.
   - Only fix correctness issues.

8) NAMESPACES (MUST EXIST)
   - Root <html> must include:
       xmlns="http://www.w3.org/1999/xhtml"
       xmlns:h="http://xmlns.jcp.org/jsf/html"
       xmlns:f="http://xmlns.jcp.org/jsf/core"
       xmlns:ui="http://xmlns.jcp.org/jsf/facelets"
       xmlns:fn="http://xmlns.jcp.org/jsp/jstl/functions"

9) DATA RENDERING
   - Office list must be rendered using:
       <ui:repeat value="#{officesBean.agencies}" var="office" varStatus="status">
   - Count text like "X offices returned" must use:
       <h:outputText value="#{fn:length(officesBean.agencies)}" />

DELIVERABLE:
- Output ONLY the corrected Offices.xhtml file.
- Do NOT explain.
- Do NOT generate backing bean code.
- File must compile and run under JSF 2.x (Open Liberty).