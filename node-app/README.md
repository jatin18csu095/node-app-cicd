Approach: Parsed the Python file with ast to extract function names, signatures, and docstrings.
	•	Multi-step prompting:
	1.	“Transform docstring into user-friendly API entry (Markdown).”
	2.	“Provide a best-practices docstring checklist for consistency.”
(via wrapper API if configured; otherwise local fallback).
	•	Output: Compiles all entries + checklists into Markdown (or simple HTML).