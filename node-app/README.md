# (optional) create venv
# python -m venv .venv && .venv\Scripts\activate   # Windows
# source .venv/bin/activate                         # macOS/Linux

# If you want LLM prompts via wrapper, install requests:
pip install requests

# Generate Markdown:
python docstring_api_docgen.py -i sample_module.py -o api_docs.md

# Or simple HTML:
python docstring_api_docgen.py -i sample_module.py -o api_docs.html --html