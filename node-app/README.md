You are migrating a legacy JSP page to JSF Facelets (.xhtml) for Open Liberty.

INPUT:
- Source file: JSP (I will paste the full JSP content below)
- Target file: <TargetName>.xhtml
- Project follows existing migrated files like createCase.xhtml and Offices.xhtml

========================
STRICT CONVERSION RULES
========================

1) OUTPUT FORMAT
- Produce a valid JSF Facelets XHTML file ONLY.
- Do NOT explain inside the output.
- Use the same indentation and table-based layout as the JSP as much as possible.

2) XHTML ROOT + NAMESPACES (MANDATORY)
Use exactly this structure:

<?xml version="1.0" encoding="ISO-8859-1"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:h="http://xmlns.jcp.org/jsf/html"
      xmlns:f="http://xmlns.jcp.org/jsf/core"
      xmlns:ui="http://xmlns.jcp.org/jsf/facelets"
      xmlns:fn="http://xmlns.jcp.org/jsp/jstl/functions">

3) REMOVE ALL JSP CODE
- ABSOLUTELY NO:
  <% ... %>
  <%= ... %>
  JSP directives
- Any server-side logic must be represented using JSF EL:
  #{bean.property}
  #{bean.action}

4) FORMS
- Replace <form> with <h:form id="...">
- Replace submit buttons with:
  <h:commandButton value="..." action="#{bean.method}" />
- Do NOT use form.submit() for server actions.

5) INPUTS
- Replace <input type="text"> with <h:inputText value="#{bean.field}" />
- Replace <input type="hidden"> with <h:inputHidden value="#{bean.field}" />
- Replace request.getParameter() usage with bean properties.

6) ITERATION / LOOPS
- Convert loops (for / while / c:forEach) to:
  <ui:repeat value="#{bean.list}" var="item" varStatus="status">
- Preserve table layout and indentation.

7) JAVASCRIPT (CRITICAL)
- External JS files remain as-is.
- Inline JavaScript MUST be wrapped like this:

<h:outputScript target="head">
  //<![CDATA[
  function example() {
    // JavaScript only
  }
  //]]>
</h:outputScript>

- NO #{...} expressions inside JavaScript.
- NO PrimeFaces expressions.
- JavaScript may only manipulate DOM or click JSF buttons.

8) ACTION TRIGGERS
- If JavaScript needs to trigger server logic:
  - Add hidden JSF command buttons:
    <h:commandButton id="doAction"
                     action="#{bean.method}"
                     style="display:none" />
  - JavaScript should call:
    document.getElementById('formId:doAction').click();

9) STYLING
- Keep all CSS links unchanged.
- Keep existing class names and layout intact.

10) UNUSED FILE SAFETY
- Even if the page is not wired into navigation:
  - Output must compile cleanly
  - No runtime-breaking code
  - No over-engineering required

========================
DELIVERABLE
========================

When responding, provide ONLY:

1) The complete migrated XHTML file
2) A short section listing:
   - Backing bean name
   - Required properties
   - Required action methods

========================
NOW MIGRATE THE JSP BELOW
========================