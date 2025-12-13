You are converting a legacy JSP page to XHTML as part of a minimal-impact migration (MIR) for Open Liberty.

⚠️ This is NOT a JSF refactor or redesign.
⚠️ DO NOT introduce JSF lifecycle, managed beans, or JSF components.

Core Rules (MANDATORY)
	1.	Do NOT use JSF tags
	•	❌ No <f:view>
	•	❌ No <h:form>, <h:inputText>, <h:selectOneMenu>, <ui:repeat>, <ui:fragment>
	•	❌ No EL replacements for JSP logic
	2.	Preserve JSP logic exactly
	•	Keep all <% %> scriptlets
	•	Keep all if, for, try/catch logic unchanged
	•	Do not replace JSP variables with EL expressions
	3.	Preserve JavaScript exactly
	•	Do not modify function logic
	•	Do not rename IDs, names, or functions
	•	JavaScript relies on:
	•	document.getElementsByName(...)
	•	document.getElementById(...)
	•	window.parent.*
	•	These must continue working as-is
	4.	Use plain HTML form elements only
	•	Use <form>, <input>, <select>, <option>
	•	Keep original name, id, value, onclick attributes unchanged
	•	Do not allow JSF to rewrite client IDs
	5.	HTML → XHTML only
	•	Close all tags properly
	•	Quote all attributes
	•	Keep structure, layout, and nesting identical
	•	Do not reduce or optimize tables
	6.	Do NOT change behavior
	•	No business logic changes
	•	No rendering condition changes
	•	No backend assumptions

⸻

Output Requirements
	•	Valid XHTML syntax
	•	Same runtime behavior as original JSP
	•	Same JavaScript execution
	•	Same form submission flow
	•	Same DOM structure

Example (Correct
<form name="MyFrm" id="MyFrm" method="post" action="Offices.jsp">
  <input type="hidden" name="ReturnAll" id="ReturnAll" value="false" />

Example (Incorrect – DO NOT DO THIS)

<f:view>
  <h:form>
    <h:inputText />

Final Instruction

This is a syntax migration, NOT a framework migration.
If a change alters runtime behavior, it is INVALID.
