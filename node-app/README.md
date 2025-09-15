How many optional leaves are granted to a Hasher?
Employees are entitled to 2 optional leaves per year as per the HR policy.


We implemented a HashBot in Python that allows users to ask questions from pre-defined policy/reference documents (e.g., HR policy, Employee Handbook). The bot works by:
	1.	Loading documents (PDFs) from a given folder.
	2.	Splitting them into chunks using text extraction.
	3.	Vectorizing the chunks with TF-IDF.
	4.	Matching user queries against the most relevant text chunks using cosine similarity.
	5.	Returning the best-matched answer.
	6.	If no relevant answer is found, the bot replies with: “I don’t have this information.”
