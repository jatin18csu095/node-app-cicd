You are converting a legacy JSP page (Offices.jsp) into a proper JSF 2.x Facelets page (Offices.xhtml) for Open Liberty.

STRICT RULES (must follow):
1) The output MUST be valid JSF/Facelets XHTML, not JSP. Absolutely NO JSP scriptlets or expressions are allowed:
   - Remove all occurrences of: <% ... %>, <%= ... %>, JSP directives, and any raw Java code in the XHTML.
   - If you see Java like: String..., boolean..., request.getParameter(...), session.getId(), response.sendRedirect(...), move that logic into a managed bean.
2) Replace HTML <form action="Offices.jsp" method="post"> with <h:form id="MyFrm"> and JSF components.
   - Use <h:inputHidden> for ReturnAll
   - Use <h:selectOneMenu> for SearchOpt and bind it to a bean property (e.g., #{officesBean.searchOpt})
   - Use <h:inputText> for SearchTxt bound to #{officesBean.searchTxt}
   - Replace submit/search buttons with <h:commandButton> actions calling bean methods (e.g., #{officesBean.search}, #{officesBean.returnAll}, #{officesBean.addSelected}, #{officesBean.cancel})
3) All dynamic values must be EL bindings to bean properties, NOT JSP:
   - Replace <%=sSearchTxt%> with #{officesBean.searchTxt}
   - Replace any selected-option logic (<%=sSelected1%>) by binding the selectOneMenu value to a bean field and using f:selectItem(s).
4) Keep the HTML table layout/indentation as close as possible to the current file (do not reformat heavily). Only change tags where necessary to make it proper JSF.
5) JavaScript:
   - Keep existing JS functions (fCollectOffices, fSelectAll, fOnLoad, fDoAllSearch, fDoAdvSearch) but place them inside <h:outputScript> in the <h:head>.
   - Wrap inline JS in CDATA:
     //<![CDATA[
     ...js...
     //]]>
   - External JS/CSS should be included via:
     <h:outputStylesheet library="..." name="..." /> or keep the existing <link> if that’s the project standard.
     <h:outputScript library="..." name="..." /> for main.js OR keep <script src> only if required by the project.
6) Namespaces:
   - The root <html> must include:
     xmlns="http://www.w3.org/1999/xhtml"
     xmlns:h="http://xmlns.jcp.org/jsf/html"
     xmlns:f="http://xmlns.jcp.org/jsf/core"
     xmlns:ui="http://xmlns.jcp.org/jsf/facelets"
     xmlns:fn="http://xmlns.jcp.org/jsp/jstl/functions"
7) Data rendering:
   - If the page shows a list of offices/agencies, render it using <ui:repeat value="#{officesBean.offices}" var="office" varStatus="status"> (or the correct bean list).
   - Checkboxes must keep the SAME name attribute expected by the JavaScript (e.g., name="cbxoffice") so fCollectOffices() still works.
     If JSF changes client IDs, use plain HTML <input type="checkbox" name="cbxoffice" value="#{office}" .../> inside ui:repeat so document.getElementsByName("cbxoffice") keeps working.
   - For counts/messages like “X offices returned”, bind them to bean properties (e.g., #{officesBean.officesCount}, #{officesBean.userOffcsMsg}) and render via <h:outputText escape="false" /> only where HTML is intentionally included.
8) Remove DOCTYPE XHTML Transitional. Use <!DOCTYPE html> (or follow project standard), but ensure it still parses as Facelets XHTML.

DELIVERABLE:
- Produce the corrected Offices.xhtml only (no explanations).
- The file must compile under JSF/Facelets: no JSP remnants, no raw Java code in XHTML.
- Keep indentation and structure consistent with the existing page.